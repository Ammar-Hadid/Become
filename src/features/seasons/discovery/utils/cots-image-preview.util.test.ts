import { describe, expect, it } from "vitest";
import type { CotsCandidateView } from "@/features/seasons/discovery/types/cots-discovery.types";
import { cotsImagePreviewHref } from "./cots-image-preview.util";

function candidate(previewHref: string | null): CotsCandidateView {
  return {
    candidateRef: "candidate-1",
    provider: "fixture",
    externalId: "fixture-1",
    form: "IMAGE",
    title: "Fixture image",
    previewHref,
    width: 600,
    height: 750,
    text: null,
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

describe("COTS image preview URLs", () => {
  it("returns no URL when a candidate has no preview", () => {
    expect(cotsImagePreviewHref(candidate(null))).toBeNull();
  });

  it("selects thumbnail and large renditions without losing query values", () => {
    expect(cotsImagePreviewHref(candidate("/preview/candidate-1"))).toBe(
      "/preview/candidate-1?size=thumbnail",
    );
    expect(
      cotsImagePreviewHref(
        candidate("/preview/candidate-1?token=fixture"),
        true,
      ),
    ).toBe("/preview/candidate-1?token=fixture&size=large");
  });
});
