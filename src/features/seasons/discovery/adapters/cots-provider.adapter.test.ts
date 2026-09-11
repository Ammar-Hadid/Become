import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCotsProvider, cotsProviderRoute } from "./cots-provider.adapter";
import { providerJson } from "../services/cots-provider-http.service";
import type { ProviderQuery } from "../types/cots-provider.types";
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: {} }));
vi.mock("../services/cots-provider-http.service", async (original) => ({
  ...(await original<
    typeof import("../services/cots-provider-http.service")
  >()),
  providerJson: vi.fn(),
}));
const base: ProviderQuery = {
  kind: "TEXT",
  cursor: null,
  identity: {
    id: "identity",
    identityRevision: 1,
    displayName: "Test Hero",
    subjectKind: "FICTIONAL",
    sourceCategory: "anime",
    registryVersion: 1,
    discoveryContextId: "context",
    discoveryRevision: 1,
    sourceWork: "Test Work",
    adaptation: "",
    language: "en",
    savedAt: "2026-09-10",
  },
};
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("COTS external service contracts", () => {
  it("routes each explicit category separately for images and text", () => {
    expect(cotsProviderRoute({ ...base, kind: "IMAGE" })).toEqual([
      "zerochan",
      "serpapi",
      "brave",
    ]);
    expect(
      cotsProviderRoute({
        ...base,
        kind: "IMAGE",
        identity: { ...base.identity, sourceCategory: "person" },
      })[0],
    ).toBe("commons");
    for (const category of ["game", "comic"] as const)
      expect(
        cotsProviderRoute({
          ...base,
          identity: { ...base.identity, sourceCategory: category },
        }),
      ).toEqual(["wikiquote", "community"]);
    expect(
      cotsProviderRoute({
        ...base,
        identity: { ...base.identity, sourceCategory: "book" },
      }),
    ).toEqual(["wikiquote", "wikisource"]);
  });
  it("rejects similarly named anime characters from a different work", async () => {
    vi.mocked(providerJson).mockResolvedValue({
      data: [
        {
          content: "Synthetic matching sentence.",
          character: { name: "Test Hero" },
          anime: { name: "Test Work" },
        },
        {
          content: "Synthetic unrelated sentence.",
          character: { name: "Test Hero" },
          anime: { name: "Other Work" },
        },
      ],
    });
    const result = await fetchCotsProvider("animechan", base);
    expect(result.items.map((v) => v.text)).toEqual([
      "Synthetic matching sentence.",
    ]);
    expect(result.next).toBeNull();
  });
  it("accepts provider spelling variants that differ only by diacritics and punctuation", async () => {
    vi.mocked(providerJson).mockResolvedValue({
      data: [
        {
          content: "The choice belongs to this worldline.",
          character: { id: 1, name: "Rintaro Okabe" },
          anime: { name: "Steins Gate" },
        },
      ],
    });
    const result = await fetchCotsProvider("animechan", {
      ...base,
      identity: {
        ...base.identity,
        displayName: "Rintarō Okabe",
        sourceWork: "Steins;Gate",
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      speaker: "Rintaro Okabe",
      sourceWork: "Steins Gate",
      text: "The choice belongs to this worldline.",
    });
  });
  it("uses Zerochan's returned canonical tag as matching evidence", async () => {
    vi.stubEnv("COTS_ZEROCHAN_USERNAME", "fixture-user");
    vi.mocked(providerJson).mockResolvedValue({
      items: [
        {
          id: 3718060,
          tag: "Okabe Rintarou",
          tags: ["Steins;Gate", "Okabe Rintarou"],
          thumbnail: "https://s3.zerochan.net/240/10/11/3718060.avif",
          width: 2500,
          height: 4073,
        },
      ],
    });
    const result = await fetchCotsProvider("zerochan", {
      ...base,
      kind: "IMAGE",
      identity: {
        ...base.identity,
        displayName: "Rintarō Okabe",
        sourceWork: "Steins;Gate",
      },
    });
    expect(result.items[0]).toMatchObject({
      externalId: "3718060",
      previewUrl: "https://s3.zerochan.net/240/10/11/3718060.avif",
      sourceDetail: expect.stringContaining(
        "Matched character tag: Okabe Rintarou",
      ),
    });
    expect(providerJson).toHaveBeenCalledWith(
      "zerochan",
      expect.any(URL),
      expect.objectContaining({
        redirects: "same-origin-preserve-query",
      }),
    );
  });
  it("pins deeper Wikiquote pages to the same source revision", async () => {
    vi.mocked(providerJson).mockResolvedValue({
      parse: {
        revid: 123,
        title: "Test Work",
        wikitext: {
          "*":
            "== Test Hero ==\n" +
            Array.from(
              { length: 13 },
              (_, i) => `* Synthetic fixture sentence number ${i}.`,
            ).join("\n"),
        },
      },
    });
    const first = await fetchCotsProvider("wikiquote", base);
    expect(first.items).toHaveLength(12);
    const second = await fetchCotsProvider("wikiquote", {
      ...base,
      cursor: first.next,
    });
    expect(second.items).toHaveLength(1);
    expect(
      vi.mocked(providerJson).mock.calls[1][1].searchParams.get("oldid"),
    ).toBe("123");
    expect(second.next).toBeNull();
  });
  it("does not turn source links or book narration into a character quotation", async () => {
    const result = await fetchCotsProvider("wikisource", {
      ...base,
      identity: { ...base.identity, sourceCategory: "book" },
    });
    expect(result.items[0]).toMatchObject({
      form: "SOURCE_LINK",
      text: null,
      importable: false,
      speaker: null,
    });
    expect(providerJson).not.toHaveBeenCalled();
  });
  it("follows observed TV season pages while keeping source revision pagination", async () => {
    vi.mocked(providerJson)
      .mockResolvedValueOnce({
        parse: {
          title: "Test Work",
          links: [
            { "*": "Test Work (season 1)" },
            { "*": "Unrelated (season 2)" },
          ],
          wikitext: { "*": "== Seasons ==" },
        },
      })
      .mockResolvedValueOnce({
        parse: {
          title: "Test Work (season 1)",
          revid: 44,
          wikitext: {
            "*": "== Pilot ==\n:'''Test Hero:''' An explicit synthetic speaker turn.",
          },
        },
      });
    const result = await fetchCotsProvider("wikiquote", {
      ...base,
      identity: { ...base.identity, sourceCategory: "tv" },
    });
    expect(result.items[0]).toMatchObject({
      sourceWork: "Test Work (season 1)",
      form: "DIALOGUE_TURN",
      speaker: "Test Hero",
    });
    expect(
      vi.mocked(providerJson).mock.calls[1][1].searchParams.get("page"),
    ).toBe("Test Work (season 1)");
  });
  it("does not label book-page dialogue as a Movie source", async () => {
    vi.mocked(providerJson).mockResolvedValue({
      parse: {
        title: "Test Work",
        categories: [{ "*": "Novels" }],
        revid: 55,
        wikitext: {
          "*": "== Test Hero ==\n* A synthetic sentence from a novel.",
        },
      },
    });
    const result = await fetchCotsProvider("wikiquote", {
      ...base,
      identity: { ...base.identity, sourceCategory: "movie" },
    });
    expect(result.items[0]).toMatchObject({
      form: "SOURCE_LINK",
      importable: false,
      text: null,
    });
  });
  it("parses explicit Clip.Cafe speaker turns without merging other speakers", async () => {
    vi.stubEnv("COTS_CLIPCAFE_API_KEY", "fixture");
    vi.stubEnv("COTS_CLIPCAFE_RETENTION_ALLOWED", "true");
    vi.stubEnv("COTS_CLIPCAFE_MONTHLY_COST_USD", "10");
    vi.stubEnv("COTS_MONTHLY_SPEND_LIMIT_USD", "15");
    vi.mocked(providerJson).mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              clipID: "test",
              movie_title: "Test Work",
              movie_slug: "test-work",
              slug: "fixture",
              transcript:
                "Test Hero:\nSynthetic first turn.\nOther Person:\nSomeone else's sentence.\nTest Hero: Synthetic second turn.",
            },
          },
        ],
      },
    });
    const result = await fetchCotsProvider("clipcafe", base);
    expect(result.items.map((v) => v.text)).toEqual([
      "Synthetic first turn.",
      "Synthetic second turn.",
    ]);
    expect(result.items.every((v) => v.form === "DIALOGUE_TURN")).toBe(true);
  });
  it("reads STANDS4's documented results envelope and exact author match", async () => {
    vi.stubEnv("COTS_STANDS4_UID", "fixture");
    vi.stubEnv("COTS_STANDS4_TOKEN_ID", "fixture");
    vi.stubEnv("COTS_STANDS4_RETENTION_ALLOWED", "true");
    vi.mocked(providerJson).mockResolvedValue({
      results: {
        result: [
          { quote: "Synthetic text.", author: "Test Hero" },
          { quote: "Unrelated text.", author: "Other" },
        ],
      },
    });
    expect((await fetchCotsProvider("stands4", base)).items).toHaveLength(1);
  });
  it("treats Brave image search as a finite result set and requires storage permission", async () => {
    vi.stubEnv("COTS_BRAVE_SEARCH_API_KEY", "fixture");
    vi.stubEnv("COTS_BRAVE_STORAGE_ALLOWED", "false");
    await expect(fetchCotsProvider("brave", base)).rejects.toThrow(
      "storage entitlement",
    );
    expect(providerJson).not.toHaveBeenCalled();
    vi.stubEnv("COTS_BRAVE_STORAGE_ALLOWED", "true");
    vi.stubEnv("COTS_MONTHLY_SPEND_LIMIT_USD", "5");
    vi.mocked(providerJson).mockResolvedValue({
      results: [
        {
          title: "Fixture",
          url: "https://example.com/work",
          properties: { url: "https://example.com/image.webp" },
        },
      ],
    });
    expect(
      (await fetchCotsProvider("brave", { ...base, kind: "IMAGE" })).next,
    ).toBeNull();
  });
});
