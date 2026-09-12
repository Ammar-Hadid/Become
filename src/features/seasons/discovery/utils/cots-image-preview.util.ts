import type { CotsCandidateView } from "@/features/seasons/discovery/types/cots-discovery.types";

export function cotsImagePreviewHref(
  candidate: CotsCandidateView,
  large = false,
) {
  if (!candidate.previewHref) return null;
  const separator = candidate.previewHref.includes("?") ? "&" : "?";
  return `${candidate.previewHref}${separator}size=${large ? "large" : "thumbnail"}`;
}
