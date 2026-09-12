"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentCommandResult } from "@/features/content/types/content.types";

export type ContentAutosaveStatus =
  "idle" | "saving" | "saved" | "error" | "conflict";

type UncertainAttempt<Draft> = {
  fingerprint: string;
  key: string;
  value: Draft;
  save: (value: Draft, operationKey: string) => Promise<ContentCommandResult>;
};

export function useContentAutosave<Draft>({
  value,
  enabled = true,
  save,
  onConfirmed,
  delay = 800,
}: {
  value: Draft;
  enabled?: boolean;
  save: (value: Draft, operationKey: string) => Promise<ContentCommandResult>;
  onConfirmed: (result: ContentCommandResult) => void;
  delay?: number;
}) {
  const fingerprint = JSON.stringify(value);
  const saveRef = useRef(save);
  const onConfirmedRef = useRef(onConfirmed);
  const confirmedFingerprintRef = useRef(fingerprint);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<Draft | null>(null);
  const uncertainRef = useRef<UncertainAttempt<Draft> | null>(null);
  const flushWaiters = useRef<((saved: boolean) => void)[]>([]);
  const [confirmedFingerprint, setConfirmedFingerprint] = useState(fingerprint);
  const [blockedFingerprint, setBlockedFingerprint] = useState<string | null>(
    null,
  );
  const [requiresRecovery, setRequiresRecovery] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const [status, setStatus] = useState<ContentAutosaveStatus>("idle");
  const [result, setResult] = useState<ContentCommandResult | null>(null);

  useEffect(() => {
    saveRef.current = save;
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed, save]);

  const perform = useCallback(async (candidate: Draft) => {
    const requestedFingerprint = JSON.stringify(candidate);
    if (inFlightRef.current) {
      queuedRef.current = candidate;
      return;
    }

    const unresolved = uncertainRef.current;
    if (unresolved && unresolved.fingerprint !== requestedFingerprint) {
      queuedRef.current = candidate;
    }
    const attempt =
      unresolved ??
      ({
        fingerprint: requestedFingerprint,
        key: crypto.randomUUID(),
        value: candidate,
        save: saveRef.current,
      } satisfies UncertainAttempt<Draft>);
    if (attempt.fingerprint === confirmedFingerprintRef.current) return;

    inFlightRef.current = true;
    setBlockedFingerprint(null);
    setStatus("saving");
    setResult(null);
    let recovered = false;
    try {
      const response = await attempt.save(attempt.value, attempt.key);
      if (response.delivery === "uncertain") {
        uncertainRef.current = attempt;
        setBlockedFingerprint(attempt.fingerprint);
        setRequiresRecovery(true);
        setStatus("error");
        setResult(response);
      } else if (response.error) {
        uncertainRef.current = null;
        setBlockedFingerprint(attempt.fingerprint);
        setRequiresRecovery(Boolean(response.workspace));
        setStatus(response.workspace ? "conflict" : "error");
        setResult(response);
      } else {
        recovered = true;
        uncertainRef.current = null;
        setBlockedFingerprint(null);
        setRequiresRecovery(false);
        confirmedFingerprintRef.current = attempt.fingerprint;
        setConfirmedFingerprint(attempt.fingerprint);
        setStatus("saved");
        setResult(response);
        onConfirmedRef.current(response);
      }
    } catch {
      uncertainRef.current = attempt;
      setBlockedFingerprint(attempt.fingerprint);
      setRequiresRecovery(true);
      setStatus("error");
      setResult({
        error:
          "The save may not have reached Become. Retry with the same draft.",
        delivery: "uncertain",
      });
    } finally {
      inFlightRef.current = false;
      if (recovered && queuedRef.current) {
        queuedRef.current = null;
        setQueueTick((current) => current + 1);
      }
    }
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      requiresRecovery ||
      fingerprint === confirmedFingerprint ||
      fingerprint === blockedFingerprint
    )
      return;
    const timer = window.setTimeout(
      () => void perform(value),
      flushWaiters.current.length ? 0 : delay,
    );
    return () => window.clearTimeout(timer);
  }, [
    blockedFingerprint,
    confirmedFingerprint,
    delay,
    enabled,
    fingerprint,
    perform,
    queueTick,
    requiresRecovery,
    value,
  ]);

  const retry = useCallback(() => void perform(value), [perform, value]);
  const flush = useCallback((): Promise<boolean> => {
    if (fingerprint === confirmedFingerprint && !inFlightRef.current)
      return Promise.resolve(true);
    if (
      !requiresRecovery &&
      fingerprint !== blockedFingerprint &&
      fingerprint !== confirmedFingerprint
    ) {
      const completion = new Promise<boolean>((resolve) =>
        flushWaiters.current.push(resolve),
      );
      void perform(value);
      return completion;
    }
    return Promise.resolve(false);
  }, [
    blockedFingerprint,
    confirmedFingerprint,
    fingerprint,
    perform,
    requiresRecovery,
    value,
  ]);
  useEffect(() => {
    const complete =
      fingerprint === confirmedFingerprint && !inFlightRef.current;
    if (complete || status === "error" || status === "conflict") {
      flushWaiters.current.splice(0).forEach((resolve) => resolve(complete));
    }
  }, [confirmedFingerprint, fingerprint, status]);
  useEffect(
    () => () => {
      flushWaiters.current.splice(0).forEach((resolve) => resolve(false));
    },
    [],
  );
  const accept = useCallback((serverValue: Draft) => {
    const serverFingerprint = JSON.stringify(serverValue);
    confirmedFingerprintRef.current = serverFingerprint;
    uncertainRef.current = null;
    queuedRef.current = null;
    setConfirmedFingerprint(serverFingerprint);
    setBlockedFingerprint(null);
    setRequiresRecovery(false);
    setResult(null);
    setStatus("idle");
  }, []);

  return {
    accept,
    dirty: fingerprint !== confirmedFingerprint,
    flush,
    result,
    retry,
    status,
  };
}
