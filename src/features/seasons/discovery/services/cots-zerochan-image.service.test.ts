import { afterEach, describe, expect, it, vi } from "vitest";
import { providerJson } from "./cots-provider-http.service";
import { resolveZerochanImage } from "./cots-zerochan-image.service";
import type { ProviderCandidate } from "../types/cots-provider.types";

vi.mock("./cots-provider-http.service", () => ({
  providerJson: vi.fn(),
  record: (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {},
  string: (value: unknown) => (typeof value === "string" ? value : ""),
  array: (value: unknown) => (Array.isArray(value) ? value : []),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const candidate: ProviderCandidate = {
  provider: "zerochan",
  externalId: "3718060",
  form: "IMAGE",
  title: "Rintarō Okabe",
  width: 2500,
  height: 4073,
  text: null,
  speaker: null,
  sourceUrl: "https://www.zerochan.net/3718060",
  sourceWork: "Steins;Gate",
  sourceDetail: "Matched character tag: Okabe Rintarou.",
  credit: null,
  license: null,
  evidence: "PROVIDER",
  language: "en",
  importable: true,
  unavailableReason: null,
  previewUrl: "https://s3.zerochan.net/240/10/11/3718060.avif",
};

describe("Zerochan image detail", () => {
  it("resolves the supported 600-pixel rendition and full original", async () => {
    vi.stubEnv("COTS_ZEROCHAN_USERNAME", "fixture-user");
    vi.mocked(providerJson).mockResolvedValue({
      large: "https://s1.zerochan.net/Okabe.Rintarou.600.3718060.jpg",
      full: "https://static.zerochan.net/Okabe.Rintarou.full.3718060.jpg",
      artist: "Fixture artist",
      sources: ["https://example.com/original"],
    });

    await expect(resolveZerochanImage(candidate)).resolves.toEqual({
      largeUrl: "https://s1.zerochan.net/Okabe.Rintarou.600.3718060.jpg",
      originalUrl:
        "https://static.zerochan.net/Okabe.Rintarou.full.3718060.jpg",
      credit: "Fixture artist",
      references: ["https://example.com/original"],
    });
    expect(providerJson).toHaveBeenCalledWith(
      "zerochan",
      new URL("https://www.zerochan.net/3718060?json"),
      expect.objectContaining({
        redirects: "same-origin-preserve-query",
      }),
    );
  });

  it("rejects non-Zerochan references before making a provider request", async () => {
    vi.stubEnv("COTS_ZEROCHAN_USERNAME", "fixture-user");
    await expect(
      resolveZerochanImage({ ...candidate, provider: "serpapi" }),
    ).rejects.toThrow("invalid");
    expect(providerJson).not.toHaveBeenCalled();
  });
});
