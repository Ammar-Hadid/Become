import { describe, expect, it } from "vitest";
import {
  normalizeCotsQuote,
  normalizeCotsText,
} from "./cots-text-normalizer.util";

describe("COTS text normalization", () => {
  it("removes parenthesized and bare URLs without leaving empty punctuation", () => {
    expect(
      normalizeCotsText(
        "Fear is just a thought. (https://example.com/quote?id=12)",
      ),
    ).toBe("Fear is just a thought.");
    expect(
      normalizeCotsText("Read https://example.com/source and carry on."),
    ).toBe("Read and carry on.");
  });

  it("keeps markdown labels while removing their destination", () => {
    expect(
      normalizeCotsText("Remember [the lesson](https://example.com)."),
    ).toBe("Remember the lesson.");
  });

  it("removes quotation marks supplied by the source before the gallery adds its own", () => {
    expect(
      normalizeCotsQuote("“But the way you said it… I believed you.”"),
    ).toEqual({
      text: "But the way you said it… I believed you.",
      sourceContext: "",
    });
  });

  it("removes source labels that become empty after URL removal", () => {
    expect(normalizeCotsText("Source: https://example.com")).toBe("");
  });

  it("rejects media labels posing as quotes", () => {
    expect(
      normalizeCotsQuote("absolutely a misogynist (YouTube video)"),
    ).toBeNull();
    expect(
      normalizeCotsQuote(
        "I'm a realist and when you're a realist you're sexist. (same YouTube video)",
      ),
    ).toEqual({
      text: "I'm a realist and when you're a realist you're sexist.",
      sourceContext: "same YouTube video",
    });
  });

  it("rejects raw social posts with addressed handles or email addresses", () => {
    expect(
      normalizeCotsQuote(
        "Hello @GretaThunberg I have 33 cars. Please provide your email address so I can send a complete list.",
      ),
    ).toBeNull();
    expect(
      normalizeCotsQuote("Send your answer to editor@example.com."),
    ).toBeNull();
    expect(
      normalizeCotsQuote("Change begins with an honest decision."),
    ).toEqual({
      text: "Change begins with an honest decision.",
      sourceContext: "",
    });
  });
});
