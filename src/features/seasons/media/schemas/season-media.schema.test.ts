import { describe, expect, it } from "vitest";
import { quoteDraftSchema } from "./season-media.schema";

const exactQuote = {
  text: "A line worth keeping.",
  attribution: "",
  kind: "EXACT" as const,
  featured: false,
  provenance: {
    sourceUrl: "",
    sourceTitle: "",
    credit: "",
    attributionVerified: false,
  },
};

describe("manual season quote validation", () => {
  it("accepts exact wording without optional attribution or source details", () => {
    expect(quoteDraftSchema.parse(exactQuote)).toMatchObject(exactQuote);
  });

  it("still requires the quote text", () => {
    expect(() => quoteDraftSchema.parse({ ...exactQuote, text: "" })).toThrow();
  });
});
