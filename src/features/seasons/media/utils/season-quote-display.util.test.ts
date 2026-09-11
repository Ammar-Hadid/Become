import { describe, expect, it } from "vitest";
import { seasonQuoteDisplay } from "@/features/seasons/media/utils/season-quote-display.util";
import type { SeasonQuoteView } from "@/features/seasons/types/season.types";

function quote(
  patch: Partial<SeasonQuoteView> & {
    provenance?: SeasonQuoteView["provenance"] & Record<string, unknown>;
  } = {},
): SeasonQuoteView {
  return {
    id: "quote-1",
    text: "A line worth returning to.",
    attribution: "A character",
    kind: "EXACT",
    featured: true,
    provenance: {
      origin: "DISCOVERY",
      sourceUrl: "https://example.test/source",
      sourceTitle: "The source work",
      credit: null,
      provider: "Example archive",
      externalId: "external-1",
      selectedAt: "2026-09-10T12:00:00.000Z",
      attributionVerified: false,
      ...patch.provenance,
    },
    ...patch,
  };
}

describe("seasonQuoteDisplay", () => {
  it("presents a passage as source prose instead of character speech", () => {
    const display = seasonQuoteDisplay(
      quote({
        provenance: {
          ...quote().provenance,
          form: "PASSAGE",
          evidence: "COMMUNITY",
        },
      }),
    );

    expect(display.text).toBe("A line worth returning to.");
    expect(display.attribution).toBe("The source work");
    expect(display.formLabel).toBe("Passage");
    expect(display.evidenceLabel).toBe(
      "Community sourced · not independently verified",
    );
  });

  it("keeps provider attribution visibly distinct from verification", () => {
    const display = seasonQuoteDisplay(
      quote({
        provenance: {
          ...quote().provenance,
          form: "DIALOGUE_TURN",
          evidence: "PROVIDER",
        },
      }),
    );

    expect(display.text).toBe("“A line worth returning to.”");
    expect(display.formLabel).toBe("Dialogue");
    expect(display.evidenceLabel).toBe(
      "Example archive attributed · not independently verified",
    );
  });
});
