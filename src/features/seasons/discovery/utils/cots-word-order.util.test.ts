import { describe, expect, it } from "vitest";
import type {
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import { orderCotsWordCandidates } from "./cots-word-order.util";

function candidate(candidateRef: string): CotsCandidateView {
  return {
    candidateRef,
    provider: "fixture",
    externalId: candidateRef,
    form: "QUOTATION",
    title: candidateRef,
    previewHref: null,
    width: null,
    height: null,
    text: `Words for ${candidateRef}`,
    speaker: null,
    sourceUrl: "https://example.com/source",
    sourceWork: "Fixture work",
    sourceDetail: "Fixture detail",
    credit: null,
    license: null,
    evidence: "PROVIDER",
    language: "en",
    importable: true,
    unavailableReason: null,
  };
}

function selection(value: CotsCandidateView): CotsSelectionView {
  return {
    id: `selection-${value.candidateRef}`,
    candidateRef: value.candidateRef,
    candidate: value,
    identityId: "identity-1",
    sourceCategory: "book",
    sourceWork: "Fixture work",
    adaptation: "",
    status: "SELECTED",
    desiredPoster: false,
    mediaId: null,
    quoteId: null,
    error: null,
  };
}

describe("COTS word carousel ordering", () => {
  it("moves selected quotes first without changing order inside either group", () => {
    const candidates = [
      candidate("first"),
      candidate("second"),
      candidate("third"),
      candidate("fourth"),
    ];

    expect(
      orderCotsWordCandidates(candidates, [
        selection(candidates[1]),
        selection(candidates[3]),
      ]).map(({ candidateRef }) => candidateRef),
    ).toEqual(["second", "fourth", "first", "third"]);
  });
});
