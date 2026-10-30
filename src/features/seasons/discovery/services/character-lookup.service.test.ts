import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  json: vi.fn(),
  settings: vi.fn(),
  ai: vi.fn(),
}));
vi.mock("./cots-provider-http.service", () => ({
  providerJson: mocks.json,
  record: (v: unknown) => (v && typeof v === "object" ? v : {}),
  array: (v: unknown) => (Array.isArray(v) ? v : []),
  string: (v: unknown) => (typeof v === "string" ? v : ""),
}));
vi.mock("@/features/nexo/queries/nexo-settings.query", () => ({
  getNexoSettings: mocks.settings,
}));
vi.mock("@/features/nexo/services/nexo-runtime.service", () => ({
  executeAiTask: mocks.ai,
}));
vi.mock("./character-catalogue-images.service", () => ({
  characterCatalogueImages: (candidate: { images: unknown[] }) =>
    Promise.resolve(candidate.images),
}));
import { lookupCharacter } from "./character-lookup.service";
// URL validation is covered separately because gallery lookup is isolated above.
const row = {
  id: 123,
  name: { full: "Test Character", native: "", alternative: [] },
  description: "Catalogue biography.",
  image: {
    large: "https://s4.anilist.co/file/anilistcdn/character/large/test.jpg",
  },
  media: {
    nodes: [
      {
        id: 44,
        idMal: 22,
        title: { english: "Test Story" },
        type: "ANIME",
        format: "TV",
      },
    ],
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.json.mockResolvedValue({ data: { Page: { characters: [row] } } });
  mocks.settings.mockResolvedValue({
    config: { profiles: [], assignments: [] },
    credentialStatus: {},
  });
});
describe("source-grounded character lookup", () => {
  it("recognizes a unique catalogue match without waiting for settings or AI", async () => {
    const result = await lookupCharacter({
      name: "Compact lookup",
    });
    expect(result.suggestedId).toBe("anilist:123");
    expect(result.suggestedWorkId).toBe(44);
    expect(result.aiUsed).toBe(false);
    expect(mocks.settings).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("leaves ambiguous catalogue identities for an explicit choice", async () => {
    mocks.json.mockResolvedValue({
      data: { Page: { characters: [row, { ...row, id: 999 }] } },
    });
    const result = await lookupCharacter({
      name: "Ambiguous compact lookup",
    });
    expect(result.candidates).toHaveLength(2);
    expect(result.suggestedId).toBeNull();
    expect(result.suggestedWorkId).toBeNull();
  });
  it("finds a shorter catalogue name without AI and narrows it by the source work", async () => {
    mocks.json.mockImplementation(async (_provider, _url, options) => {
      const { search } = JSON.parse(options.body).variables;
      return {
        data: {
          Page: {
            characters:
              search === "Levi"
                ? [
                    {
                      ...row,
                      id: 52885,
                      name: { ...row.name, full: "Levi Kazama" },
                      media: {
                        nodes: [
                          {
                            ...row.media.nodes[0],
                            title: { english: "Trinity Seven" },
                          },
                        ],
                      },
                    },
                    {
                      ...row,
                      id: 45627,
                      name: { ...row.name, full: "Levi" },
                      media: {
                        nodes: [
                          {
                            ...row.media.nodes[0],
                            title: { english: "Attack on Titan" },
                          },
                        ],
                      },
                    },
                  ]
                : [],
          },
        },
      };
    });
    const result = await lookupCharacter({
      name: "Levi Ackerman",
      sourceWork: "Attack on Titan",
    });
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "anilist:45627",
    ]);
    expect(result.candidates[0].name).toBe("Levi");
    expect(result.aiUsed).toBe(false);
    expect(result.suggestedId).toBe("anilist:45627");
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.json).toHaveBeenCalledTimes(2);
  });

  it("also tries the opposite name order and normalizes source punctuation", async () => {
    mocks.json.mockImplementation(async (_provider, _url, options) => {
      const { search } = JSON.parse(options.body).variables;
      const characters =
        search === "Family"
          ? [row]
          : search === "Given"
            ? [
                {
                  ...row,
                  id: 901,
                  media: {
                    nodes: [
                      {
                        ...row.media.nodes[0],
                        title: { english: "Another: Story!" },
                      },
                    ],
                  },
                },
              ]
            : [];
      return { data: { Page: { characters } } };
    });
    const result = await lookupCharacter({
      name: "Family Given",
      sourceWork: "Another Story",
    });
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "anilist:901",
    ]);
    expect(mocks.json).toHaveBeenCalledTimes(3);
  });

  it("bounds empty-name fallback to two additional catalogue requests", async () => {
    mocks.json.mockResolvedValue({ data: { Page: { characters: [] } } });
    const result = await lookupCharacter({
      name: "Missing First Last",
      sourceWork: "Unknown work",
    });
    expect(result.candidates).toEqual([]);
    expect(mocks.json).toHaveBeenCalledTimes(3);
    expect(mocks.ai).not.toHaveBeenCalled();
  });

  it("propagates catalogue outages instead of reporting an empty match", async () => {
    mocks.json.mockRejectedValue(new Error("Catalogue unavailable"));
    await expect(lookupCharacter({ name: "Outage Example" })).rejects.toThrow(
      "Catalogue unavailable",
    );
    expect(mocks.json).toHaveBeenCalledTimes(1);
    expect(mocks.ai).not.toHaveBeenCalled();
  });

  it("returns real records and images without presenting an unconnected lookup as AI", async () => {
    const result = await lookupCharacter({ name: "retrieved record" });
    expect(result.aiUsed).toBe(false);
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(result.candidates[0].id).toBe("anilist:123");
    expect(result.candidates[0].images).toHaveLength(1);
    expect(result.suggestedId).toBe("anilist:123");
  });
  it("does not trust arbitrary image URLs returned in catalogue content", async () => {
    mocks.json.mockResolvedValue({
      data: {
        Page: {
          characters: [
            { ...row, image: { large: "http://127.0.0.1/private" } },
          ],
        },
      },
    });
    const result = await lookupCharacter({ name: "untrusted-image" });
    expect(result.candidates[0].images).toEqual([]);
  });
});
