"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ContentScriptView,
  ScriptDocument,
  ScriptSaveRequest,
  ScriptSaveResult,
} from "@/features/content/scripts/types/content-script.types";

export type ContentScriptSaveStatus =
  "dirty" | "saving" | "saved" | "error" | "conflict";

type SaveAttempt = {
  document: ScriptDocument;
  fingerprint: string;
  operationKey: string;
};

function fingerprint(document: ScriptDocument) {
  return JSON.stringify(document);
}

export function useContentScriptAutosave({
  initialData,
  document,
  enabled = true,
  onSave,
  onSaved,
  delay = 800,
}: {
  initialData: ContentScriptView;
  document: ScriptDocument;
  enabled?: boolean;
  onSave: (request: ScriptSaveRequest) => Promise<ScriptSaveResult>;
  onSaved?: (script: ContentScriptView) => void;
  delay?: number;
}) {
  const initialFingerprint = fingerprint(initialData.document);
  const currentFingerprint = fingerprint(document);
  const documentRef = useRef(document);
  const currentFingerprintRef = useRef(currentFingerprint);
  const confirmedFingerprintRef = useRef(initialFingerprint);
  const scriptVersionRef = useRef(initialData.scriptVersion);
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const queuedRef = useRef<ScriptDocument | null>(null);
  const uncertainRef = useRef<SaveAttempt | null>(null);
  const blockedFingerprintRef = useRef<string | null>(null);
  const drainRef = useRef<Promise<boolean> | null>(null);
  const [confirmedFingerprint, setConfirmedFingerprint] =
    useState(initialFingerprint);
  const [status, setStatus] = useState<ContentScriptSaveStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(initialData.savedAt);
  const [conflict, setConflict] = useState<ContentScriptView | null>(null);

  useEffect(() => {
    documentRef.current = document;
    currentFingerprintRef.current = fingerprint(document);
  }, [document]);

  useEffect(() => {
    onSaveRef.current = onSave;
    onSavedRef.current = onSaved;
  }, [onSave, onSaved]);

  const drain = useCallback((): Promise<boolean> => {
    if (drainRef.current) return drainRef.current;

    const run = async () => {
      while (enabled) {
        const queuedDocument = queuedRef.current;
        const recovery = uncertainRef.current;
        const candidate = recovery?.document ?? queuedDocument;
        if (!candidate) return true;

        const candidateFingerprint = fingerprint(candidate);
        if (
          !recovery &&
          candidateFingerprint === confirmedFingerprintRef.current
        ) {
          queuedRef.current = null;
          return true;
        }

        if (!recovery) queuedRef.current = null;
        const attempt: SaveAttempt = recovery ?? {
          document: candidate,
          fingerprint: candidateFingerprint,
          operationKey: crypto.randomUUID(),
        };

        setStatus("saving");
        setMessage(null);
        blockedFingerprintRef.current = null;

        let result: ScriptSaveResult;
        try {
          result = await onSaveRef.current({
            document: attempt.document,
            expectedScriptVersion: scriptVersionRef.current,
            operationKey: attempt.operationKey,
          });
        } catch {
          uncertainRef.current = attempt;
          blockedFingerprintRef.current = attempt.fingerprint;
          setStatus("error");
          setMessage(
            "The save may not have reached Become. Retry before leaving.",
          );
          return false;
        }

        if (result.kind === "uncertain") {
          uncertainRef.current = attempt;
          blockedFingerprintRef.current = attempt.fingerprint;
          setStatus("error");
          setMessage(result.message);
          return false;
        }

        if (result.kind === "rejected") {
          uncertainRef.current = null;
          blockedFingerprintRef.current = attempt.fingerprint;
          setStatus("error");
          setMessage(result.message);
          return false;
        }

        if (result.kind === "conflict") {
          uncertainRef.current = null;
          queuedRef.current = null;
          blockedFingerprintRef.current = attempt.fingerprint;
          scriptVersionRef.current = result.latest.scriptVersion;
          setConflict(result.latest);
          setStatus("conflict");
          setMessage(result.message);
          return false;
        }

        uncertainRef.current = null;
        blockedFingerprintRef.current = null;
        scriptVersionRef.current = result.script.scriptVersion;
        confirmedFingerprintRef.current = attempt.fingerprint;
        setConfirmedFingerprint(attempt.fingerprint);
        setSavedAt(result.script.savedAt);
        onSavedRef.current?.(result.script);

        const currentFingerprint = currentFingerprintRef.current;
        if (currentFingerprint !== attempt.fingerprint) {
          queuedRef.current = documentRef.current;
          setStatus("dirty");
          continue;
        }

        setStatus("saved");
        return true;
      }

      return false;
    };

    const running = run().finally(() => {
      drainRef.current = null;
    });
    drainRef.current = running;
    return running;
  }, [enabled]);

  const dirty = currentFingerprint !== confirmedFingerprint;
  const displayedStatus =
    status === "dirty" && !dirty && !conflict ? "saved" : status;

  useEffect(() => {
    const currentFingerprint = fingerprint(document);
    if (!enabled || currentFingerprint === confirmedFingerprint) return;
    if (
      status === "saving" ||
      status === "conflict" ||
      (status === "error" &&
        blockedFingerprintRef.current === currentFingerprint)
    )
      return;

    setStatus("dirty");
    setMessage(null);
    const timer = window.setTimeout(() => {
      queuedRef.current = documentRef.current;
      void drain();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [confirmedFingerprint, delay, document, drain, enabled, status]);

  const flush = useCallback(async () => {
    if (!enabled) return true;
    if (conflict) return false;
    blockedFingerprintRef.current = null;
    queuedRef.current = documentRef.current;
    const firstPass = await drain();
    if (!firstPass) return false;
    if (currentFingerprintRef.current === confirmedFingerprintRef.current)
      return true;
    queuedRef.current = documentRef.current;
    return drain();
  }, [conflict, drain, enabled]);

  const retry = useCallback(() => {
    blockedFingerprintRef.current = null;
    queuedRef.current = documentRef.current;
    return drain();
  }, [drain]);

  const keepLocal = useCallback(async () => {
    if (!conflict) return false;
    const latestFingerprint = fingerprint(conflict.document);
    scriptVersionRef.current = conflict.scriptVersion;
    confirmedFingerprintRef.current = latestFingerprint;
    setConfirmedFingerprint(latestFingerprint);
    setSavedAt(conflict.savedAt);
    setConflict(null);
    setMessage(null);
    setStatus("dirty");
    blockedFingerprintRef.current = null;
    queuedRef.current = documentRef.current;
    return drain();
  }, [conflict, drain]);

  const acceptLatest = useCallback(() => {
    if (!conflict) return null;
    const accepted = conflict;
    const latestFingerprint = fingerprint(accepted.document);
    scriptVersionRef.current = accepted.scriptVersion;
    confirmedFingerprintRef.current = latestFingerprint;
    currentFingerprintRef.current = latestFingerprint;
    documentRef.current = accepted.document;
    queuedRef.current = null;
    uncertainRef.current = null;
    blockedFingerprintRef.current = null;
    setConfirmedFingerprint(latestFingerprint);
    setSavedAt(accepted.savedAt);
    setConflict(null);
    setMessage(null);
    setStatus("saved");
    onSavedRef.current?.(accepted);
    return accepted;
  }, [conflict]);

  return {
    acceptLatest,
    conflict,
    dirty,
    flush,
    isBlocking:
      dirty ||
      displayedStatus === "saving" ||
      displayedStatus === "error" ||
      Boolean(conflict),
    keepLocal,
    message: displayedStatus === "saved" ? null : message,
    retry,
    savedAt,
    status: displayedStatus,
  };
}
