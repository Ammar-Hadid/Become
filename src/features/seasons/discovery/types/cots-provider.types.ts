import type {
  CotsCandidateView,
  CotsIdentityView,
  CotsSourceStatus,
} from "@/features/seasons/discovery/types/cots-discovery.types";
export type ProviderCandidate = Omit<
  CotsCandidateView,
  "candidateRef" | "previewHref"
> & {
  originalUrl?: string;
  previewUrl?: string;
  imageQuality?: {
    assetKey: string;
    perceptualHash?: string;
    relevanceScore: number;
  };
  /** One-based provider order when the source exposes a popularity-oriented list. */
  popularityRank?: number;
};
export type ProviderPage = {
  items: ProviderCandidate[];
  next: string | null;
  status: CotsSourceStatus;
  message: string;
};
export type ProviderQuery = {
  identity: CotsIdentityView;
  kind: "IMAGE" | "TEXT";
  cursor: string | null;
};
