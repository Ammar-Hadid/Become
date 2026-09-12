import { describe, expect, it } from "vitest";
import type { CotsIdentityView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import {
  cotsImageAssetKey,
  cotsImageSearchQuery,
  deduplicateCotsImageCandidates,
  rankCotsImageCandidates,
} from "./cots-image-quality.util";

function identity(
  displayName: string,
  sourceCategory: NonNullable<CotsIdentityView["sourceCategory"]>,
  sourceWork = "",
): CotsIdentityView {
  return {
    id: "identity",
    identityRevision: 1,
    displayName,
    subjectKind: sourceCategory === "person" ? "PERSON" : "FICTIONAL",
    sourceCategory,
    registryVersion: 1,
    discoveryContextId: "context",
    discoveryRevision: 1,
    sourceWork,
    adaptation: "",
    language: "en",
    savedAt: "2026-09-11T00:00:00.000Z",
  };
}

function image(
  title: string,
  sourceDetail: string,
  originalUrl: string,
): ProviderCandidate {
  return {
    provider: "serpapi",
    externalId: originalUrl,
    form: "IMAGE",
    title,
    width: 1200,
    height: 1600,
    text: null,
    speaker: null,
    sourceUrl: `https://example.com/${encodeURIComponent(title)}`,
    sourceWork: "",
    sourceDetail,
    credit: null,
    license: null,
    evidence: "PROVIDER",
    language: "en",
    importable: true,
    unavailableReason: null,
    originalUrl,
    previewUrl: originalUrl,
  };
}

describe("COTS image discovery quality", () => {
  it.each([
    [
      identity("Levi Ackerman", "anime", "Attack on Titan"),
      '"Levi Ackerman" "Attack on Titan" anime character -nsfw -ecchi -echi -hentai -nude -explicit',
    ],
    [
      identity("Elliot Alderson", "tv", "Mr. Robot"),
      '"Elliot Alderson" "Mr. Robot" TV character -nsfw -ecchi -echi -hentai -nude -explicit',
    ],
    [
      identity("David Bowie", "person"),
      '"David Bowie" portrait photograph -nsfw -ecchi -echi -hentai -nude -explicit',
    ],
  ])(
    "builds an identity- and category-specific query for %s",
    (value, expected) => {
      expect(cotsImageSearchQuery(value)).toBe(expected);
    },
  );

  it("keeps character-centric anime art ahead of logos and namesakes", () => {
    const value = identity("Levi Ackerman", "anime", "Attack on Titan");
    const ranked = rankCotsImageCandidates(value, [
      image(
        "Attack on Titan logo vector",
        "Series emblem",
        "https://images.example.com/logo.png",
      ),
      image(
        "Levi Strauss portrait",
        "Unrelated historical person",
        "https://images.example.com/namesake.jpg",
      ),
      image(
        "Levi Ackerman — Attack on Titan character art",
        "Anime illustration of Levi Ackerman",
        "https://images.example.com/levi.jpg",
      ),
    ]);

    expect(ranked.map((candidate) => candidate.title)).toEqual([
      "Levi Ackerman — Attack on Titan character art",
    ]);
  });

  it("removes explicitly adult-tagged anime results before ranking", () => {
    const value = identity("Mikasa Ackerman", "anime", "Attack on Titan");
    const ranked = rankCotsImageCandidates(value, [
      image(
        "Mikasa Ackerman",
        "Matched character tag: Mikasa Ackerman. Ecchi, Bikini, Large Breasts.",
        "https://images.example.com/adult-mikasa.jpg",
      ),
      image(
        "Mikasa Ackerman — Attack on Titan",
        "Anime character portrait with red scarf",
        "https://images.example.com/mikasa-scarf.jpg",
      ),
    ]);

    expect(ranked.map((candidate) => candidate.title)).toEqual([
      "Mikasa Ackerman — Attack on Titan",
    ]);
  });

  it("keeps the TV identity while rejecting show graphics and actor-only results", () => {
    const value = identity("Elliot Alderson", "tv", "Mr. Robot");
    const ranked = rankCotsImageCandidates(value, [
      image(
        "Mr. Robot fsociety logo vector",
        "Television series symbol",
        "https://images.example.com/fsociety.svg.png",
      ),
      image(
        "Rami Malek portrait",
        "Actor interview about Mr. Robot",
        "https://images.example.com/actor.jpg",
      ),
      image(
        "Elliot Alderson in Mr. Robot season one",
        "Character still of Elliot Alderson",
        "https://images.example.com/elliot.jpg",
      ),
    ]);

    expect(ranked.map((candidate) => candidate.title)).toEqual([
      "Elliot Alderson in Mr. Robot season one",
    ]);
  });

  it("requires the full public-figure identity and removes non-portrait graphics", () => {
    const value = identity("David Bowie", "person");
    const ranked = rankCotsImageCandidates(value, [
      image(
        "David Bowie logo vector",
        "Merchandise graphic",
        "https://images.example.com/bowie-logo.png",
      ),
      image(
        "David Beckham portrait",
        "Unrelated public figure",
        "https://images.example.com/beckham.jpg",
      ),
      image(
        "David Bowie performing in 1975",
        "Photograph of David Bowie on stage",
        "https://images.example.com/bowie-1975.jpg",
      ),
    ]);

    expect(ranked.map((candidate) => candidate.title)).toEqual([
      "David Bowie performing in 1975",
    ]);
  });

  it("collapses common rendition URL variants before they occupy rail slots", () => {
    const first = image(
      "David Bowie portrait",
      "David Bowie photograph",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/David_Bowie.jpg/1400px-David_Bowie.jpg",
    );
    const second = image(
      "David Bowie portrait",
      "David Bowie photograph",
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/David_Bowie.jpg?width=900&utm_source=test",
    );

    expect(cotsImageAssetKey(first)).toBe(cotsImageAssetKey(second));
    expect(
      rankCotsImageCandidates(identity("David Bowie", "person"), [
        first,
        second,
      ]),
    ).toHaveLength(1);
  });

  it("collapses visually near-identical candidates across different asset URLs", () => {
    const first = image(
      "Elliot Alderson portrait",
      "Mr. Robot character still",
      "https://one.example.com/elliot.jpg",
    );
    const second = image(
      "Elliot Alderson close crop",
      "Mr. Robot character still",
      "https://two.example.com/elliot.webp",
    );
    first.imageQuality = {
      assetKey: cotsImageAssetKey(first),
      perceptualHash: `${"0".repeat(64)}.${"f".repeat(64)}`,
      relevanceScore: 150,
    };
    second.imageQuality = {
      assetKey: cotsImageAssetKey(second),
      perceptualHash: `${"0".repeat(63)}1.${"f".repeat(63)}e`,
      relevanceScore: 145,
    };

    expect(deduplicateCotsImageCandidates([first, second])).toEqual([first]);
  });
});
