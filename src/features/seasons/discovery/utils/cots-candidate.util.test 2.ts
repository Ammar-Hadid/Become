import { describe, expect, it } from "vitest";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { sanitizeCotsCandidate } from "./cots-candidate.util";

const image: ProviderCandidate = {
  provider: "serpapi",
  externalId: "fixture",
  form: "IMAGE",
  title: "Test character",
  width: 1200,
  height: 800,
  text: null,
  speaker: null,
  sourceUrl: "https://example.com/source",
  sourceWork: "Test work",
  sourceDetail: "Synthetic search result",
  credit: null,
  license: null,
  evidence: "PROVIDER",
  language: "en",
  importable: true,
  unavailableReason: null,
  originalUrl: "https://images.example.com/original.jpg",
  previewUrl: "https://images.example.com/preview.jpg",
};

describe("COTS candidate importability", () => {
  it("keeps public image hosts that the importer can fetch", () => {
    expect(sanitizeCotsCandidate(image)?.originalUrl).toBe(
      "https://images.example.com/original.jpg",
    );
  });

  it("omits Fandom CDN images that challenge server-side downloads", () => {
    expect(
      sanitizeCotsCandidate({
        ...image,
        originalUrl:
          "https://static.wikia.nocookie.net/work/images/a/a1/Character.jpg/revision/latest",
      }),
    ).toBeNull();
  });

  it("rejects images carrying explicit adult or suggestive metadata", () => {
    expect(
      sanitizeCotsCandidate({
        ...image,
        title: "Mikasa Ackerman",
        sourceDetail:
          "Matched character tag: Mikasa Ackerman. Attack on Titan, Ecchi, Large Breasts.",
      }),
    ).toBeNull();
  });

  it("normalizes URLs out of text from every provider", () => {
    expect(
      sanitizeCotsCandidate({
        ...image,
        form: "QUOTATION",
        originalUrl: undefined,
        previewUrl: undefined,
        text: "A useful quote. (https://example.com/noise)",
      })?.text,
    ).toBe("A useful quote.");
  });

  it("rejects a quote that contains only a source label and URL", () => {
    expect(
      sanitizeCotsCandidate({
        ...image,
        form: "QUOTATION",
        originalUrl: undefined,
        previewUrl: undefined,
        text: "Source: https://example.com/noise",
      }),
    ).toBeNull();
  });

  it("rejects raw addressed social posts from every provider", () => {
    expect(
      sanitizeCotsCandidate({
        ...image,
        form: "QUOTATION",
        originalUrl: undefined,
        previewUrl: undefined,
        text: "Hello @GretaThunberg. Please provide your email address.",
      }),
    ).toBeNull();
  });
});
