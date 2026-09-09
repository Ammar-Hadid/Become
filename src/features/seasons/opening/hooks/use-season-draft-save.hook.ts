"use client";

import { useCallback, useRef, useState } from "react";
import type { CommandResult } from "@/features/direction/types/direction.types";
import {
  sendDirectionCommand,
  type DirectionClientResult,
} from "@/features/direction/commands/utils/direction-command-client.util";
import type {
  SeasonDraft,
  SeasonView,
} from "@/features/seasons/types/season.types";

export type SeasonSaveState =
  "idle" | "saving" | "saved" | "error" | "conflict";

export function useSeasonDraftSave(season: SeasonView) {
  const versionRef = useRef(season.version);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const activeRef = useRef(new Map<string, Promise<DirectionClientResult>>());
  const conflictRef = useRef<DirectionClientResult | null>(null);
  const uncertainRef = useRef<{
    fingerprint: string;
    key: string;
    run: () => Promise<DirectionClientResult>;
  } | null>(null);
  const [state, setState] = useState<SeasonSaveState>("idle");
  const [result, setResult] = useState<CommandResult>({ error: null });

  const enqueue = useCallback(
    (
      fingerprint: string,
      work: (
        version: number,
        operationKey: string,
      ) => Promise<DirectionClientResult>,
    ) => {
      if (conflictRef.current) return Promise.resolve(conflictRef.current);
      const active = activeRef.current.get(fingerprint);
      if (active) return active;
      setState("saving");
      const next = queueRef.current.then(async () => {
        if (conflictRef.current) return conflictRef.current;
        const prior = uncertainRef.current;
        if (prior && prior.fingerprint !== fingerprint) {
          const recovered = await prior.run();
          if (
            recovered.version !== undefined &&
            recovered.version > versionRef.current
          )
            versionRef.current = recovered.version;
          if (recovered.delivery === "uncertain") {
            setResult(recovered);
            setState("error");
            return recovered;
          }
          uncertainRef.current = null;
          if (recovered.error) {
            const conflict = /changed|current version|stale|conflict/i.test(
              recovered.error,
            );
            if (conflict) conflictRef.current = recovered;
            setResult(recovered);
            setState(conflict ? "conflict" : "error");
            return recovered;
          }
        }

        const retry = uncertainRef.current;
        const operationKey = retry?.key ?? crypto.randomUUID();
        const expectedVersion = versionRef.current;
        const run = retry?.run ?? (() => work(expectedVersion, operationKey));
        const response = await run();
        setResult(response);
        if (
          response.version !== undefined &&
          response.version > versionRef.current
        )
          versionRef.current = response.version;
        if (response.delivery === "uncertain") {
          uncertainRef.current = { fingerprint, key: operationKey, run };
        } else if (uncertainRef.current?.fingerprint === fingerprint) {
          uncertainRef.current = null;
        }
        if (response.error) {
          const conflict = /changed|current version|stale|conflict/i.test(
            response.error,
          );
          if (conflict) conflictRef.current = response;
          setState(conflict ? "conflict" : "error");
        } else {
          setState("saved");
        }
        return response;
      });
      activeRef.current.set(fingerprint, next);
      void next.then(
        () => activeRef.current.delete(fingerprint),
        () => activeRef.current.delete(fingerprint),
      );
      queueRef.current = next.catch(() => undefined);
      return next;
    },
    [],
  );

  const requireReview = useCallback((error: string) => {
    const conflict: DirectionClientResult = {
      error,
      delivery: "confirmed",
    };
    conflictRef.current = conflict;
    setResult(conflict);
    setState("conflict");
  }, []);

  const acceptReviewedVersion = useCallback((version: number) => {
    if (
      !Number.isSafeInteger(version) ||
      version < versionRef.current ||
      activeRef.current.size > 0 ||
      uncertainRef.current
    )
      return false;
    versionRef.current = version;
    conflictRef.current = null;
    setResult({ error: null });
    setState("idle");
    return true;
  }, []);

  const saveDraft = useCallback(
    (draft: SeasonDraft, complete = false) => {
      const identity = {
        type: "SAVE_SEASON" as const,
        year: season.year,
        quarter: season.quarter,
        draft,
        complete,
      };
      return enqueue(
        JSON.stringify(identity),
        (expectedVersion, operationKey) =>
          sendDirectionCommand({
            ...identity,
            expectedVersion,
            operationKey,
          }),
      );
    },
    [enqueue, season.quarter, season.year],
  );

  const assignGoals = useCallback(
    (
      goals: {
        goalId: string;
        role: "PRIMARY" | "SUPPORTING";
        note: string;
      }[],
    ) => {
      const identity = {
        type: "ASSIGN_SEASON_GOALS" as const,
        year: season.year,
        quarter: season.quarter,
        goals,
      };
      return enqueue(
        JSON.stringify(identity),
        (expectedVersion, operationKey) =>
          sendDirectionCommand({
            ...identity,
            expectedVersion,
            operationKey,
          }),
      );
    },
    [enqueue, season.quarter, season.year],
  );

  return {
    acceptReviewedVersion,
    assignGoals,
    fieldErrors: result.fieldErrors ?? {},
    requireReview,
    result,
    saveDraft,
    state,
    version: versionRef,
  };
}
