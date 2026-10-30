import { describe, expect, it } from "vitest";
import {
  streamingSummaryParagraphs,
  preparationEstimate,
} from "./onboarding-stream.util";
describe("streamed summary preview", () => {
  it("keeps citation markers from disguising unfinished sentences", async () => {
    const { isCompleteProse } = await import("../utils/complete-prose.util");
    expect(isCompleteProse("A complete sentence. [s1] [source-two]")).toBe(
      true,
    );
    expect(isCompleteProse("An unfinished sent [s1]")).toBe(false);
    expect(isCompleteProse("[s1]")).toBe(false);
  });
  it("handles every chunk boundary without exposing JSON or unfinished paragraphs", () => {
    const paragraphs = [
      'A quoted "word", a slash \\ and a café. [s1]',
      "A second paragraph.",
    ];
    const json = JSON.stringify({
      draft: { summary: paragraphs.join("\n\n"), profile: {} },
    });
    for (let i = 0; i <= json.length; i++) {
      const result = streamingSummaryParagraphs(json.slice(0, i));
      expect(result).toEqual(paragraphs.slice(0, result.length));
    }
    expect(streamingSummaryParagraphs(json)).toEqual(paragraphs);
  });
  it("handles partial unicode escapes and rejects other fields or a missing draft", () => {
    expect(
      streamingSummaryParagraphs(
        '{"draft":{"summary":"A \\u2014 sentence.\\n\\nNext',
      ),
    ).toEqual(["A — sentence."]);
    expect(
      streamingSummaryParagraphs('{"draft":null,"question":"Question?"}'),
    ).toEqual([]);
    expect(
      streamingSummaryParagraphs('{"draft":{"profile":{"summary":"Nested"}}}'),
    ).toEqual([]);
  });
  it("uses observed timings and excludes research when it is already saved", () => {
    expect(preparationEstimate([60, 80, 100], [40, 50, 60], true)).toEqual({
      minMs: 100,
      maxMs: 160,
      samples: 3,
    });
    expect(preparationEstimate([], [40, 50, 60], false)).toEqual({
      minMs: 40,
      maxMs: 60,
      samples: 3,
    });
    expect(preparationEstimate([1], [2], true)).toBeNull();
  });
});
