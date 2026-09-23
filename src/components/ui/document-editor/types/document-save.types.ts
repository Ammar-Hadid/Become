export type VersionedDocumentView<TDocument> = {
  document: TDocument;
  version: number;
  savedAt: string | null;
};

export type DocumentSaveRequest<TDocument> = {
  document: TDocument;
  expectedVersion: number;
  operationKey: string;
};

export type DocumentSaveResult<TView> =
  | { kind: "saved"; view: TView }
  | { kind: "conflict"; message: string; latest: TView }
  | { kind: "uncertain"; message: string }
  | { kind: "rejected"; message: string };

export type DocumentSaveStatus =
  "dirty" | "saving" | "saved" | "error" | "conflict";
