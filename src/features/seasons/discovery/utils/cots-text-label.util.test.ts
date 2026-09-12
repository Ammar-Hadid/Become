import { describe, expect, it } from "vitest";
import type { CotsCandidateView } from "@/features/seasons/discovery/types/cots-discovery.types";
import { cotsTextChoiceLabel } from "./cots-text-label.util";

function candidate(text: string | null): CotsCandidateView {
  return {
    candidateRef: "candidate",
    provider: "fixture",
    externalId: "external",
    form: "DIALOGUE_TURN",
    title: "Monkey D. Luffy",
    previewHref: null,
    width: null,
    height: null,
    text,
    speaker: "Luffy",
    sourceUrl: "https://example.com",
    sourceWork: "One Piece",
    sourceDetail: "Fixture evidence",
    credit: null,
    license: null,
    evidence: "UNRESOLVED",
    language: "en",
    importable: true,
    unavailableReason: null,
  };
}

describe("COTS text choice labels", () => {
  it("leads with a compact wording excerpt instead of repeated metadata", () => {
    const first = cotsTextChoiceLabel(
      candidate("I believe a dream is worth fighting for."),
    );
    const second = cotsTextChoiceLabel(
      candidate("But the way you said it, I believed you."),
    );

    expect(first).toBe("“I believe a dream is worth fighting for.” — Luffy");
    expect(second).toBe("“But the way you said it, I believed you.” — Luffy");
    expect(first).not.toBe(second);
  });

  it("collapses whitespace and bounds long native-select labels", () => {
    const label = cotsTextChoiceLabel(
      candidate(
        "A complete thought with   uneven spacing that continues long enough to require a concise excerpt in the featured words selector.",
      ),
    );

    expect(label).not.toContain("  ");
    expect(label).toMatch(/^“A complete thought.+…” — Luffy$/);
    expect(Array.from(label).length).toBeLessThanOrEqual(84);
  });

  it("falls back to form and title when no wording is available", () => {
    expect(cotsTextChoiceLabel(candidate(null))).toBe(
      "Dialogue · Monkey D. Luffy",
    );
  });
});
