import type { CotsContentForm } from "@/features/seasons/discovery/types/cots-discovery.types";
import {
  COTS_TEXT_FORM_LABEL,
  cotsSavedEvidenceLabel,
} from "@/features/seasons/discovery/utils/cots-text-label.util";
import type { SeasonQuoteView } from "@/features/seasons/types/season.types";

type TextProvenance = SeasonQuoteView["provenance"] & {
  evidence?: string;
  form?: CotsContentForm;
  sourceDetail?: string | null;
};

export function seasonQuoteDisplay(quote: SeasonQuoteView) {
  const provenance = quote.provenance as TextProvenance;
  const form = provenance.form;
  const isPassage = form === "PASSAGE";
  const formLabel = form
    ? COTS_TEXT_FORM_LABEL[form]
    : quote.kind === "PARAPHRASE"
      ? "Paraphrase"
      : quote.kind === "UNKNOWN"
        ? "Wording"
        : "Quote";
  const attribution = isPassage
    ? provenance.sourceTitle ||
      provenance.credit ||
      quote.attribution ||
      "Source not recorded"
    : quote.attribution ||
      provenance.sourceTitle ||
      provenance.credit ||
      "Attribution unknown";

  return {
    attribution,
    evidenceLabel: cotsSavedEvidenceLabel({
      attributionVerified: provenance.attributionVerified,
      evidence: provenance.evidence,
      provider: provenance.provider,
    }),
    formLabel,
    isPassage,
    text: isPassage ? quote.text : `“${quote.text}”`,
  };
}
