import type { CotsSourceStatus } from "@/features/seasons/discovery/types/cots-discovery.types";

export function cotsSourceStatusMessage(
  provider: string,
  status: CotsSourceStatus,
  kind: "images" | "words",
) {
  if (status === "SETUP_REQUIRED")
    return `${provider} is not connected in this Become installation.`;
  if (status === "THROTTLED")
    return `${provider} is taking a pause. Try again shortly.`;
  if (status === "EXHAUSTED")
    return `${provider} has no more ${kind} for this source.`;
  if (status === "SOURCE_LINKS_ONLY")
    return `${provider} can point you to sources to review.`;
  return `${provider} could not be reached. Manual additions still work.`;
}
