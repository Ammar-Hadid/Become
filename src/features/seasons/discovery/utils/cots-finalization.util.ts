import type { CotsSelectionView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type {
  CotsFinalizationChoices,
  CotsFinalizationImageChoice,
  CotsFinalizationQuoteChoice,
} from "@/features/seasons/discovery/types/cots-finalization.types";
import { cotsImagePreviewHref } from "@/features/seasons/discovery/utils/cots-image-preview.util";
import {
  COTS_CANDIDATE_EVIDENCE_LABEL,
  COTS_TEXT_FORM_LABEL,
} from "@/features/seasons/discovery/utils/cots-text-label.util";
import { seasonQuoteDisplay } from "@/features/seasons/media/utils/season-quote-display.util";
import type { SeasonView } from "@/features/seasons/types/season.types";

function imageDetail(selection: CotsSelectionView, fallback: string): string {
  return (
    selection.candidate.credit ||
    selection.candidate.sourceWork ||
    selection.candidate.provider ||
    fallback
  );
}

export function cotsFinalizationChoices(
  season: SeasonView,
  selections: CotsSelectionView[],
): CotsFinalizationChoices {
  const mediaById = new Map(season.media.map((media) => [media.id, media]));
  const representedMediaIds = new Set<string>();
  const images: CotsFinalizationImageChoice[] = selections
    .filter(({ candidate }) => candidate.form === "IMAGE")
    .map((selection) => {
      const media = selection.mediaId
        ? mediaById.get(selection.mediaId)
        : undefined;
      if (selection.mediaId) representedMediaIds.add(selection.mediaId);
      return {
        key: `selection:${selection.id}`,
        selectionId: selection.id,
        ...(selection.mediaId ? { mediaId: selection.mediaId } : {}),
        href:
          media?.previewHref ||
          media?.href ||
          cotsImagePreviewHref(
            selection.candidate,
            selection.candidate.provider === "zerochan",
          ),
        alt: media?.decorative ? "" : media?.alt || selection.candidate.title,
        title: selection.candidate.title,
        detail: imageDetail(selection, "Saved inspiration"),
        status: selection.status,
      };
    });

  for (const media of season.media) {
    if (representedMediaIds.has(media.id)) continue;
    images.push({
      key: `media:${media.id}`,
      mediaId: media.id,
      href: media.previewHref || media.href,
      alt: media.decorative ? "" : media.alt,
      title: media.alt || media.provenance.sourceTitle || "Saved season image",
      detail:
        media.provenance.credit ||
        media.provenance.sourceTitle ||
        "Added manually",
      status: "READY",
    });
  }

  const quoteById = new Map(season.quotes.map((quote) => [quote.id, quote]));
  const quotes: CotsFinalizationQuoteChoice[] = season.quotes.map((quote) => {
    const display = seasonQuoteDisplay(quote);
    return {
      quoteId: quote.id,
      text: quote.text,
      attribution: display.attribution,
      detail:
        quote.provenance.sourceTitle ||
        quote.provenance.credit ||
        (quote.provenance.origin === "MANUAL"
          ? "Added manually"
          : "Saved in season"),
      formLabel: display.formLabel,
      evidenceLabel: display.evidenceLabel,
    };
  });

  for (const selection of selections) {
    const { candidate } = selection;
    if (
      candidate.form === "IMAGE" ||
      candidate.form === "SOURCE_LINK" ||
      selection.status !== "READY" ||
      !selection.quoteId ||
      quoteById.has(selection.quoteId) ||
      !candidate.text
    )
      continue;
    quotes.push({
      quoteId: selection.quoteId,
      text: candidate.text,
      attribution:
        candidate.speaker || candidate.credit || "Attribution unknown",
      detail:
        [candidate.sourceWork, candidate.sourceDetail]
          .filter(Boolean)
          .join(" · ") || candidate.provider,
      formLabel: COTS_TEXT_FORM_LABEL[candidate.form],
      evidenceLabel: COTS_CANDIDATE_EVIDENCE_LABEL[candidate.evidence],
    });
  }

  const desiredSelection = selections.find(
    ({ candidate, desiredPoster }) =>
      candidate.form === "IMAGE" && desiredPoster,
  );
  const currentPoster = season.media.find(({ poster }) => poster);
  const posterSelection = currentPoster
    ? selections.find(({ mediaId }) => mediaId === currentPoster.id)
    : undefined;

  return {
    images,
    quotes,
    currentImageKey: desiredSelection
      ? `selection:${desiredSelection.id}`
      : posterSelection
        ? `selection:${posterSelection.id}`
        : currentPoster
          ? `media:${currentPoster.id}`
          : null,
    currentQuoteId: season.quotes.find(({ featured }) => featured)?.id ?? null,
  };
}
