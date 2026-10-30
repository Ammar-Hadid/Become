import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./cots-provider-http.service", () => ({
  providerJson: vi.fn(),
  reserveProviderRequest: vi.fn(),
  record: (value: unknown) => (value && typeof value === "object" ? value : {}),
  array: (value: unknown) => (Array.isArray(value) ? value : []),
  string: (value: unknown) => (typeof value === "string" ? value : ""),
}));
vi.mock("../config/cots-provider.config", () => ({
  cotsProviderEnabled: () => true,
}));
import { providerJson } from "./cots-provider-http.service";
import type { CharacterCandidate } from "../schemas/character-lookup.schema";
import {
  characterNameKey,
  trustedCharacterImage,
  characterCatalogueImages,
} from "./character-catalogue-images.service";
function candidate(id: string): CharacterCandidate {
  return {
    id,
    name: "Kaoruko Waguri",
    nativeName: "",
    aliases: [],
    description: "",
    sourceUrl: "https://anilist.co/character/268676",
    imageUrl: null,
    images: [],
    works: [
      {
        id: 181444,
        catalogueId: 1234,
        title: "The Fragrant Flower Blooms With Dignity",
        adaptation: "TV anime",
        sourceUrl: "https://anilist.co/anime/181444",
      },
    ],
  };
}
describe("character catalogue image boundaries", () => {
  beforeEach(() => vi.mocked(providerJson).mockReset());
  it("retrieves multiple originals only after the same name and anime work agree", async () => {
    vi.mocked(providerJson)
      .mockResolvedValueOnce({
        data: [{ mal_id: 99, name: "Waguri, Kaoruko" }],
      })
      .mockResolvedValueOnce({
        data: { anime: [{ anime: { mal_id: 1234 } }], manga: [] },
      })
      .mockResolvedValueOnce({
        data: [
          {
            image_url: "https://cdn.myanimelist.net/images/characters/1/1.jpg",
          },
          {
            large_image_url:
              "https://cdn.myanimelist.net/images/characters/1/2.jpg",
          },
          { image_url: "https://attacker.test/fake.png" },
        ],
      });
    const images = await characterCatalogueImages(
      candidate("multiple-gallery-test"),
    );
    expect(images).toHaveLength(2);
    expect(
      images.every(
        (image) => image.sourceUrl === "https://myanimelist.net/character/99",
      ),
    ).toBe(true);
    expect(
      vi.mocked(providerJson).mock.calls.map((call) => call[1].pathname),
    ).toEqual([
      "/v4/characters",
      "/v4/characters/99/full",
      "/v4/characters/99/pictures",
    ]);
  });
  it("rejects an equal numeric work ID belonging to a different medium", async () => {
    vi.mocked(providerJson)
      .mockResolvedValueOnce({ data: [{ mal_id: 99, name: "Kaoruko Waguri" }] })
      .mockResolvedValueOnce({
        data: { anime: [], manga: [{ manga: { mal_id: 1234 } }] },
      });
    expect(
      await characterCatalogueImages(candidate("wrong-medium-test")),
    ).toEqual([]);
    expect(providerJson).toHaveBeenCalledTimes(2);
  });
  it("leaves genuine primary images usable when the gallery fails", async () => {
    vi.mocked(providerJson).mockRejectedValueOnce(new Error("Unavailable"));
    const record = candidate("unavailable-gallery-test");
    record.images = [
      {
        href: "https://s4.anilist.co/file/anilistcdn/character/large/123.jpg",
        alt: record.name,
        sourceUrl: record.sourceUrl,
        sourceLabel: "AniList",
      },
    ];
    expect(await characterCatalogueImages(record)).toEqual(record.images);
  });
  it("matches catalogue name ordering without fuzzy character substitution", () => {
    expect(characterNameKey("Waguri, Kaoruko")).toBe(
      characterNameKey("Kaoruko Waguri"),
    );
    expect(characterNameKey("Kaoruko Waguri")).not.toBe(
      characterNameKey("Kaori Waguri"),
    );
  });
  it.each([
    "https://cdn.myanimelist.net/images/characters/12/123.jpg",
    "https://s4.anilist.co/file/anilistcdn/character/large/123.jpg",
  ])("allows only known character image paths", (url) =>
    expect(trustedCharacterImage(url)).toBe(true),
  );
  it.each([
    "http://127.0.0.1/image",
    "https://cdn.myanimelist.net.attacker.test/images/characters/a.jpg",
    "https://cdn.myanimelist.net/images/anime/a.jpg",
    "https://user:password@cdn.myanimelist.net/images/characters/a.jpg",
    "http://cdn.myanimelist.net/images/characters/a.jpg",
  ])("rejects unsafe image URL %s", (url) =>
    expect(trustedCharacterImage(url)).toBe(false),
  );
});
