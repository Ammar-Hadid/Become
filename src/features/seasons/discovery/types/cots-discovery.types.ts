export type CotsCategory =
  "anime" | "tv" | "movie" | "game" | "book" | "comic" | "person";
export type CotsIdentityView = {
  id: string;
  identityRevision: number;
  displayName: string;
  subjectKind: "FICTIONAL" | "PERSON" | "UNKNOWN";
  sourceCategory: CotsCategory | null;
  registryVersion: number;
  discoveryContextId: string | null;
  discoveryRevision: number;
  sourceWork: string;
  adaptation: string;
  language: string;
  savedAt: string;
  sourceEntityId?: string | null;
};
export type CotsContentForm =
  "IMAGE" | "QUOTATION" | "DIALOGUE_TURN" | "PASSAGE" | "SOURCE_LINK";
export type CotsSourceStatus =
  | "AVAILABLE"
  | "SETUP_REQUIRED"
  | "THROTTLED"
  | "UNAVAILABLE"
  | "EXHAUSTED"
  | "SOURCE_LINKS_ONLY";
export type CotsCollectionView = {
  identity: CotsIdentityView | null;
  selectionRevision: number;
};
export type SeasonPresentation = {
  key: string;
  secondaryMediaId: string | null;
  quoteId: string | null;
  loadingMediaId: string | null;
  cadenceMediaId: string | null;
  cadenceQuoteId: string | null;
};
