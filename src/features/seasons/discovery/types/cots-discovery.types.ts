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
export type CotsCandidateView = {
  candidateRef: string;
  provider: string;
  externalId: string;
  form: CotsContentForm;
  title: string;
  previewHref: string | null;
  width: number | null;
  height: number | null;
  text: string | null;
  speaker: string | null;
  sourceUrl: string;
  sourceWork: string;
  sourceDetail: string;
  credit: string | null;
  license: string | null;
  evidence: "COMMUNITY" | "PROVIDER" | "UNRESOLVED";
  language: string;
  importable: boolean;
  unavailableReason: string | null;
};
export type CotsSourceStatus =
  | "AVAILABLE"
  | "SETUP_REQUIRED"
  | "THROTTLED"
  | "UNAVAILABLE"
  | "EXHAUSTED"
  | "SOURCE_LINKS_ONLY";
export type CotsCandidatePage = {
  identityRevision: number;
  discoveryRevision: number;
  queryKey: string;
  items: CotsCandidateView[];
  nextCursor: string | null;
  exhausted: boolean;
  sources: { provider: string; status: CotsSourceStatus; message: string }[];
};
export type CotsSelectionView = {
  id: string;
  candidateRef: string | null;
  candidate: CotsCandidateView;
  identityId: string;
  sourceCategory: CotsCategory | null;
  sourceWork: string;
  adaptation: string;
  status: "SELECTED" | "PENDING" | "IMPORTING" | "READY" | "FAILED";
  desiredPoster: boolean;
  mediaId: string | null;
  quoteId: string | null;
  error: string | null;
};
export type CotsCollectionView = {
  identity: CotsIdentityView | null;
  selectionRevision: number;
  selections: CotsSelectionView[];
  limits: { images: number; quotes: number };
};
export type SeasonPresentation = {
  key: string;
  secondaryMediaId: string | null;
  quoteId: string | null;
  loadingMediaId: string | null;
  cadenceMediaId: string | null;
  cadenceQuoteId: string | null;
};
