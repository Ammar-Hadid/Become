import type { JSONContent } from "@tiptap/core";

/** Domain-neutral document data. Persistence and authorization stay with each feature. */
export type DocumentContent = {
  schemaVersion: 1;
  content: JSONContent;
};

export type DocumentEditorIdentity = {
  id: string;
  version: number;
  savedAt: string | null;
  readOnly: boolean;
};

export type DocumentEditorCopy = {
  documentLabel: string;
  bodyLabel: string;
  placeholder: string;
  savedLabel: string;
};
