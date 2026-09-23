import type { DocumentContent } from "@/components/ui/document-editor/types/document-editor.types";

/** Content compatibility alias for the shared document-editor value. */
export type ScriptDocument = DocumentContent;
export type ScriptSummary = {
  hasContent: boolean;
  wordCount: number;
  savedAt: string | null;
};
export type ContentScriptView = {
  contentId: string;
  variantId: string;
  contentTitle: string;
  variantName: string;
  returnHref: string;
  document: ScriptDocument;
  scriptVersion: number;
  savedAt: string | null;
  readOnly: boolean;
};
export type ScriptSaveRequest = {
  document: ScriptDocument;
  expectedScriptVersion: number;
  operationKey: string;
};
export type ScriptSaveResult =
  | { kind: "saved"; script: ContentScriptView }
  | { kind: "conflict"; message: string; latest: ContentScriptView }
  | { kind: "uncertain"; message: string }
  | { kind: "rejected"; message: string };
export type OwnedScriptImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};
export type ScriptImportResult = {
  document: ScriptDocument;
  warnings: string[];
};
