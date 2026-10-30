import type { CotsContentForm } from "@/features/seasons/discovery/types/cots-discovery.types";

export const COTS_TEXT_FORM_LABEL: Record<CotsContentForm, string> = {
  IMAGE: "Image",
  QUOTATION: "Quote",
  DIALOGUE_TURN: "Dialogue",
  PASSAGE: "Passage",
  SOURCE_LINK: "Source to review",
};

export function cotsSavedEvidenceLabel({
  attributionVerified,
  evidence,
  provider,
}: {
  attributionVerified: boolean;
  evidence?: string;
  provider?: string | null;
}) {
  if (attributionVerified || evidence === "ORIGINAL_REVIEWED")
    return "Source checked";
  if (evidence === "OFFLINE_REVIEWED") return "Offline source checked";
  if (evidence === "COMMUNITY")
    return "Community sourced · not independently verified";
  if (evidence === "PROVIDER")
    return `${provider || "Provider"} attributed · not independently verified`;
  return "Source not verified";
}
