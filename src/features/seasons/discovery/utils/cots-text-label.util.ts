import type {
  CotsCandidateView,
  CotsContentForm,
} from "@/features/seasons/discovery/types/cots-discovery.types";

export const COTS_TEXT_FORM_LABEL: Record<CotsContentForm, string> = {
  IMAGE: "Image",
  QUOTATION: "Quote",
  DIALOGUE_TURN: "Dialogue",
  PASSAGE: "Passage",
  SOURCE_LINK: "Source to review",
};

export const COTS_CANDIDATE_EVIDENCE_LABEL = {
  COMMUNITY: "Community sourced",
  PROVIDER: "Provider attributed",
  UNRESOLVED: "Source uncertain",
} as const;

function compactExcerpt(value: string, maximumLength = 72) {
  const compact = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(compact);
  if (characters.length <= maximumLength) return compact;
  return `${characters
    .slice(0, maximumLength - 1)
    .join("")
    .trimEnd()}…`;
}

export function cotsTextChoiceLabel(
  candidate: Pick<CotsCandidateView, "form" | "speaker" | "text" | "title">,
) {
  const text = candidate.text ? compactExcerpt(candidate.text) : "";
  const attribution = candidate.speaker?.trim() || candidate.title.trim();
  if (text) return `“${text}”${attribution ? ` — ${attribution}` : ""}`;
  return `${COTS_TEXT_FORM_LABEL[candidate.form]} · ${candidate.title}`;
}

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
