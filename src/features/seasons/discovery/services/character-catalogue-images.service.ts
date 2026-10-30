import "server-only";
import type {
  CharacterCandidate,
  CharacterSourceImage,
} from "../schemas/character-lookup.schema";
import { cotsProviderEnabled } from "../config/cots-provider.config";
import {
  array,
  record,
  string,
  providerJson,
  reserveProviderRequest,
} from "./cots-provider-http.service";

const cache = new Map<
  string,
  { until: number; images: CharacterSourceImage[] }
>();
export function characterNameKey(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}
export function trustedCharacterImage(href: string) {
  try {
    const url = new URL(href);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ((url.hostname === "s4.anilist.co" &&
        url.pathname.startsWith("/file/anilistcdn/character/")) ||
        (url.hostname === "cdn.myanimelist.net" &&
          url.pathname.startsWith("/images/characters/")))
    );
  } catch {
    return false;
  }
}
async function jikan(path: string) {
  await reserveProviderRequest("jikan-second", 3, 1000);
  return record(
    await providerJson("jikan", new URL(`https://api.jikan.moe/v4/${path}`), {
      limit: 50,
    }),
  );
}
export async function characterCatalogueImages(
  candidate: CharacterCandidate,
): Promise<CharacterSourceImage[]> {
  const cached = cache.get(candidate.id);
  if (cached && cached.until > Date.now()) return cached.images;
  const images = [...candidate.images];
  if (!cotsProviderEnabled("jikan")) return images;
  try {
    const names = [candidate.name, candidate.nativeName, ...candidate.aliases]
      .filter(Boolean)
      .map(characterNameKey);
    const search = await jikan(
      `characters?q=${encodeURIComponent(candidate.name)}&limit=5`,
    );
    const match = array(search.data)
      .map(record)
      .find(
        (item) =>
          names.includes(characterNameKey(string(item.name))) ||
          Boolean(
            item.name_kanji &&
            names.includes(characterNameKey(string(item.name_kanji))),
          ),
      );
    if (!match || !Number.isInteger(match.mal_id)) return images;
    const detail = record(
      (await jikan(`characters/${match.mal_id}/full`)).data,
    );
    // A similar name alone is insufficient: both catalogues must share a work ID.
    const works = [
      ...array(detail.anime).map(
        (item) => `ANIME:${record(record(item).anime).mal_id}`,
      ),
      ...array(detail.manga).map(
        (item) => `MANGA:${record(record(item).manga).mal_id}`,
      ),
    ];
    if (
      !candidate.works.some(
        (work) =>
          work.catalogueId !== null &&
          works.includes(
            `${work.adaptation === "Manga" ? "MANGA" : "ANIME"}:${work.catalogueId}`,
          ),
      )
    )
      return images;
    const gallery = await jikan(`characters/${match.mal_id}/pictures`);
    const seen = new Set(images.map((image) => image.href));
    for (const raw of array(gallery.data)) {
      const row = record(raw);
      const href = string(row.large_image_url) || string(row.image_url);
      if (!trustedCharacterImage(href) || seen.has(href)) continue;
      seen.add(href);
      images.push({
        href,
        alt: `${candidate.name} source image from MyAnimeList`,
        sourceUrl: `https://myanimelist.net/character/${match.mal_id}`,
        sourceLabel: "MyAnimeList character gallery",
      });
      if (images.length === 8) break;
    }
  } catch {
    /* Catalogue failures leave the primary record usable; never invent fallback images. */
  }
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(candidate.id, { until: Date.now() + 10 * 60_000, images });
  return images;
}
