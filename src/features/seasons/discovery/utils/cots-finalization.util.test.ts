import { describe, expect, it } from "vitest";
import type {
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import { cotsFinalizationChoices } from "@/features/seasons/discovery/utils/cots-finalization.util";
import type { SeasonView } from "@/features/seasons/types/season.types";

const provenance = {
  origin: "MANUAL" as const,
  sourceUrl: null,
  credit: null,
  sourceTitle: null,
  provider: null,
  externalId: null,
  selectedAt: "2026-09-12T00:00:00.000Z",
  attributionVerified: false,
};

function candidate(
  candidateRef: string,
  form: CotsCandidateView["form"],
): CotsCandidateView {
  return {
    candidateRef,
    provider: "fixture",
    externalId: candidateRef,
    form,
    title: `Title ${candidateRef}`,
    previewHref: form === "IMAGE" ? `/preview/${candidateRef}` : null,
    width: form === "IMAGE" ? 600 : null,
    height: form === "IMAGE" ? 750 : null,
    text: form === "IMAGE" ? null : `Words ${candidateRef}`,
    speaker: form === "IMAGE" ? null : "Speaker",
    sourceUrl: "https://example.com/source",
    sourceWork: "Fixture work",
    sourceDetail: "Fixture detail",
    credit: "Fixture credit",
    license: null,
    evidence: "PROVIDER",
    language: "en",
    importable: true,
    unavailableReason: null,
  };
}

function selection(
  id: string,
  item: CotsCandidateView,
  patch: Partial<CotsSelectionView> = {},
): CotsSelectionView {
  return {
    id,
    candidateRef: item.candidateRef,
    candidate: item,
    identityId: "identity",
    sourceCategory: "anime",
    sourceWork: "Fixture work",
    adaptation: "",
    status: "READY",
    desiredPoster: false,
    mediaId: null,
    quoteId: null,
    error: null,
    ...patch,
  };
}

describe("cotsFinalizationChoices", () => {
  it("shows saved and newly ready choices without duplicating imported media", () => {
    const season = {
      media: [
        {
          id: "media-imported",
          href: "/media/imported",
          previewHref: "/media/imported?size=preview",
          alt: "Imported portrait",
          decorative: false,
          width: 600,
          height: 750,
          focalX: 0.5,
          focalY: 0.5,
          poster: true,
          provenance,
        },
        {
          id: "media-manual",
          href: "/media/manual",
          previewHref: null,
          alt: "Manual portrait",
          decorative: false,
          width: 600,
          height: 750,
          focalX: 0.5,
          focalY: 0.5,
          poster: false,
          provenance,
        },
      ],
      quotes: [
        {
          id: "quote-manual",
          text: "A saved line",
          attribution: "",
          kind: "UNKNOWN",
          featured: true,
          provenance,
        },
      ],
    } as SeasonView;
    const selections = [
      selection("image-selection", candidate("image", "IMAGE"), {
        mediaId: "media-imported",
      }),
      selection("quote-selection", candidate("quote", "QUOTATION"), {
        quoteId: "quote-imported",
      }),
    ];

    const choices = cotsFinalizationChoices(season, selections);

    expect(choices.images.map(({ key }) => key)).toEqual([
      "selection:image-selection",
      "media:media-manual",
    ]);
    expect(choices.images[0]?.href).toBe("/media/imported?size=preview");
    expect(choices.quotes.map(({ quoteId }) => quoteId)).toEqual([
      "quote-manual",
      "quote-imported",
    ]);
    expect(choices.currentImageKey).toBe("selection:image-selection");
    expect(choices.currentQuoteId).toBe("quote-manual");
  });

  it("keeps an importing discovery preview available for deliberate choice", () => {
    const item = candidate("pending-image", "IMAGE");
    const choices = cotsFinalizationChoices(
      { media: [], quotes: [] } as unknown as SeasonView,
      [
        selection("pending-selection", item, {
          status: "IMPORTING",
          desiredPoster: true,
        }),
      ],
    );

    expect(choices.images[0]).toMatchObject({
      key: "selection:pending-selection",
      href: "/preview/pending-image?size=thumbnail",
      status: "IMPORTING",
    });
    expect(choices.currentImageKey).toBe("selection:pending-selection");
  });
});
