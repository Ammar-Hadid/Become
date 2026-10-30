"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRequestDeadline } from "@/lib/http/utils/request-deadline.util";
import { COTS_COLLECTION_UPDATED_EVENT } from "@/features/seasons/discovery/constants/cots-events.constants";
import type {
  CotsCategory,
  CotsCollectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
type IdentityDraft = {
  displayName: string;
  sourceCategory: CotsCategory;
  sourceWork: string;
  adaptation: string;
  externalId?: string;
  association?: "SAME" | "NEW";
};

function errorMessage(body: unknown, fallback: string) {
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

export function useCotsCollection(year: number, quarter: number) {
  const [collection, setCollectionState] = useState<CotsCollectionView | null>(
    null,
  );
  const collectionRef = useRef<CotsCollectionView | null>(null);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const collectionGeneration = useRef(0);
  const refreshSequence = useRef(0);

  const setCollection = useCallback((next: CotsCollectionView) => {
    collectionRef.current = next;
    setCollectionState(next);
  }, []);

  const refreshCollection = useCallback(async () => {
    const requestSequence = ++refreshSequence.current;
    const generation = collectionGeneration.current;
    try {
      const response = await fetch(
        `/api/direction/cots?year=${year}&quarter=${quarter}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok)
        throw new Error(
          errorMessage(body, "This season’s collection could not be loaded."),
        );
      if (
        requestSequence !== refreshSequence.current ||
        generation !== collectionGeneration.current
      )
        return;
      setCollection(body as CotsCollectionView);
      setError(null);
    } catch (cause) {
      if (
        requestSequence === refreshSequence.current &&
        generation === collectionGeneration.current
      )
        setError(
          cause instanceof Error
            ? cause.message
            : "This season’s collection could not be loaded.",
        );
    } finally {
      if (requestSequence === refreshSequence.current)
        setLoadingCollection(false);
    }
  }, [quarter, setCollection, year]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCollection(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshCollection]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ year?: number; quarter?: number }>)
        .detail;
      if (detail && (detail.year !== year || detail.quarter !== quarter))
        return;
      void refreshCollection();
    };
    window.addEventListener(COTS_COLLECTION_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(COTS_COLLECTION_UPDATED_EVENT, refresh);
  }, [quarter, refreshCollection, year]);

  const post = useCallback(
    async (payload: Record<string, unknown>, signal?: AbortSignal) => {
      // Confirmation may fetch two authentic catalogue images before saving.
      const deadline = createRequestDeadline(60_000, signal);
      try {
        const response = await fetch("/api/direction/cots", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ year, quarter, ...payload }),
          signal: deadline.signal,
        });
        const body = (await response.json().catch(() => null)) as unknown;
        deadline.signal.throwIfAborted();
        if (!response.ok)
          throw new Error(errorMessage(body, "That change could not be saved."));
        return body;
      } finally {
        deadline.dispose();
      }
    },
    [quarter, year],
  );

  const saveIdentity = useCallback(
    async (draft: IdentityDraft) => {
      collectionGeneration.current += 1;
      setPendingAction("identity");
      setError(null);
      try {
        const current = collectionRef.current;
        const next = (await post({
          action: "IDENTITY",
          ...draft,
          expectedIdentityRevision: current?.identity?.identityRevision ?? 0,
        })) as CotsCollectionView;
        setCollection(next);
        return next;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "This identity could not be saved.",
        );
        return null;
      } finally {
        collectionGeneration.current += 1;
        setPendingAction(null);
      }
    },
    [post, setCollection],
  );

  const confirmCharacter = useCallback(
    async (draft: {
      candidateId: string;
      workId: number;
      association?: "NEW" | "SAME";
    }) => {
      collectionGeneration.current += 1;
      setPendingAction("identity");
      setError(null);
      try {
        const result = (await post({
          action: "CONFIRM_CHARACTER",
          ...draft,
          expectedIdentityRevision:
            collectionRef.current?.identity?.identityRevision ?? 0,
        })) as {
          collection: CotsCollectionView;
          referenceNotice: string | null;
        };
        setCollection(result.collection);
        return result;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not confirm this character.",
        );
        return null;
      } finally {
        collectionGeneration.current += 1;
        setPendingAction(null);
      }
    },
    [post, setCollection],
  );

  return {
    collection,
    loadingCollection,
    pendingAction,
    error,
    setError,
    refreshCollection,
    saveIdentity,
    confirmCharacter,
  };
}
