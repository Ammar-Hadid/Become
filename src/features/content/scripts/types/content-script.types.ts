import type { JSONContent } from "@tiptap/core";

export type ScriptDocument = { schemaVersion: 1; content: JSONContent };
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
