"use client";

import { useCallback, useMemo } from "react";
import { useDocumentAutosave } from "@/components/ui/document-editor/hooks/document-autosave.hook";
import type {
  ContentScriptView,
  ScriptDocument,
  ScriptSaveRequest,
  ScriptSaveResult,
} from "@/features/content/scripts/types/content-script.types";

export type { DocumentSaveStatus as ContentScriptSaveStatus } from "@/components/ui/document-editor/types/document-save.types";

type ContentDocumentView = ContentScriptView & { version: number };

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
  const initialView = useMemo<ContentDocumentView>(
    () => ({ ...initialData, version: initialData.scriptVersion }),
    [initialData],
  );
  const save = useCallback(
    async (request: {
      document: ScriptDocument;
      expectedVersion: number;
      operationKey: string;
    }) => {
      const result = await onSave({
        document: request.document,
        expectedScriptVersion: request.expectedVersion,
        operationKey: request.operationKey,
      });
      if (result.kind === "saved")
        return {
          kind: "saved" as const,
          view: {
            ...result.script,
            version: result.script.scriptVersion,
          },
        };
      if (result.kind === "conflict")
        return {
          kind: "conflict" as const,
          message: result.message,
          latest: {
            ...result.latest,
            version: result.latest.scriptVersion,
          },
        };
      return result;
    },
    [onSave],
  );
  const saved = useCallback(
    (view: ContentDocumentView) => onSaved?.(view),
    [onSaved],
  );
  return useDocumentAutosave({
    initialData: initialView,
    document,
    enabled,
    onSave: save,
    onSaved: saved,
    delay,
  });
}
