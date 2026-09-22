"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DocumentSaveRequest,
  DocumentSaveResult,
  DocumentSaveStatus,
  VersionedDocumentView,
} from "@/components/ui/document-editor/types/document-save.types";

type SaveAttempt<TDocument> = {
  document: TDocument;
  fingerprint: string;
  operationKey: string;
};

const fingerprint = (document: unknown) => JSON.stringify(document);

/**
 * Shared save lifecycle for domain-owned editors. Domains inject persistence,
 * conflict data, validation, extensions and media behavior.
 */
export function useDocumentAutosave<
  TDocument,
  TView extends VersionedDocumentView<TDocument>,
>({
  initialData,
  document,
  enabled = true,
  onSave,
  onSaved,
  delay = 800,
}: {
  initialData: TView;
  document: TDocument;
  enabled?: boolean;
  onSave: (
    request: DocumentSaveRequest<TDocument>,
  ) => Promise<DocumentSaveResult<TView>>;
  onSaved?: (view: TView) => void;
  delay?: number;
}) {
  const initialFingerprint = fingerprint(initialData.document);
  const currentFingerprint = fingerprint(document);
  const documentRef = useRef(document);
  const currentFingerprintRef = useRef(currentFingerprint);
  const confirmedFingerprintRef = useRef(initialFingerprint);
  const versionRef = useRef(initialData.version);
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const queuedRef = useRef<TDocument | null>(null);
  const uncertainRef = useRef<SaveAttempt<TDocument> | null>(null);
  const blockedFingerprintRef = useRef<string | null>(null);
  const drainRef = useRef<Promise<boolean> | null>(null);
  const [confirmedFingerprint, setConfirmedFingerprint] =
    useState(initialFingerprint);
  const [status, setStatus] = useState<DocumentSaveStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(initialData.savedAt);
  const [version, setVersion] = useState(initialData.version);
  const [conflict, setConflict] = useState<TView | null>(null);

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
        const recovery = uncertainRef.current;
        const candidate = recovery?.document ?? queuedRef.current;
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
        const attempt = recovery ?? {
          document: candidate,
          fingerprint: candidateFingerprint,
          operationKey: crypto.randomUUID(),
        };
        setStatus("saving");
        setMessage(null);
        blockedFingerprintRef.current = null;
        let result: DocumentSaveResult<TView>;
        try {
          result = await onSaveRef.current({
            document: attempt.document,
            expectedVersion: versionRef.current,
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
          versionRef.current = result.latest.version;
          setVersion(result.latest.version);
          setConflict(result.latest);
          setStatus("conflict");
          setMessage(result.message);
          return false;
        }
        uncertainRef.current = null;
        blockedFingerprintRef.current = null;
        versionRef.current = result.view.version;
        setVersion(result.view.version);
        confirmedFingerprintRef.current = attempt.fingerprint;
        setConfirmedFingerprint(attempt.fingerprint);
        setSavedAt(result.view.savedAt);
        onSavedRef.current?.(result.view);
        if (currentFingerprintRef.current !== attempt.fingerprint) {
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
    const nextFingerprint = fingerprint(document);
    if (!enabled || nextFingerprint === confirmedFingerprint) return;
    if (
      status === "saving" ||
      status === "conflict" ||
      (status === "error" && blockedFingerprintRef.current === nextFingerprint)
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
    versionRef.current = conflict.version;
    setVersion(conflict.version);
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
    versionRef.current = accepted.version;
    setVersion(accepted.version);
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
    version,
  };
}
