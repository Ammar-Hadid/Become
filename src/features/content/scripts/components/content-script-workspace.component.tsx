"use client";

import "@/features/content/editor/styles/content-script-editor.css";

import { useCallback } from "react";
import { ContentScriptEditor } from "@/features/content/editor/components/content-script-editor.component";
import type {
  ContentScriptView,
  ScriptDocument,
  ScriptSaveRequest,
} from "@/features/content/scripts/types/content-script.types";
import {
  saveContentScript,
  uploadScriptImage,
} from "@/features/content/scripts/adapters/content-script-client.adapter";
import { importContentScript } from "@/features/content/scripts/documents/adapters/content-script-import.adapter";
import { exportContentScript } from "@/features/content/scripts/documents/adapters/content-script-export.adapter";

export function ContentScriptWorkspace({
  initialData,
}: {
  initialData: ContentScriptView;
}) {
  const { contentId, variantId, contentTitle } = initialData;
  const save = useCallback(
    (request: ScriptSaveRequest) =>
      saveContentScript(contentId, variantId, request),
    [contentId, variantId],
  );
  const upload = useCallback(
    (file: File, key: string, signal?: AbortSignal) =>
      uploadScriptImage(contentId, variantId, file, key, signal),
    [contentId, variantId],
  );
  const importDocument = useCallback(
    (file: File, signal?: AbortSignal) =>
      importContentScript(file, upload, signal),
    [upload],
  );
  const exportDocument = useCallback(
    (document: ScriptDocument, format: "docx" | "txt") =>
      exportContentScript(document, format, `${contentTitle} — script`),
    [contentTitle],
  );
  return (
    <ContentScriptEditor
      initialData={initialData}
      onSave={save}
      onUploadImage={upload}
      onImportDocument={importDocument}
      onExportDocument={exportDocument}
    />
  );
}
