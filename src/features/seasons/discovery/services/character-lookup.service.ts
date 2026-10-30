import "server-only";
import { z } from "zod";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { cotsProviderEnabled } from "../config/cots-provider.config";
import {
  array,
  record,
  string,
  providerJson,
} from "./cots-provider-http.service";
import {
  characterCandidateSchema,
  type CharacterCandidate,
  type CharacterLookupResult,
} from "../schemas/character-lookup.schema";
import { characterCatalogueImages } from "./character-catalogue-images.service";

const fields = `id name { full native alternative } description siteUrl image { large } media(perPage: 10) { nodes { id idMal title { english romaji } type format siteUrl coverImage { large } startDate { year } } }`;
const cache = new Map<
  string,
  { until: number; candidates: CharacterCandidate[] }
>();

function trustedImage(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "s4.anilist.co" &&
      url.pathname.startsWith("/file/anilistcdn/character/") &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

async function catalogue(
  search: string | number,
): Promise<CharacterCandidate[]> {
  const key = String(search);
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.candidates;
  if (!cotsProviderEnabled("anilist"))
    throw new DirectionError(
      "Character catalogue lookup is disabled. You can enter the character and upload references manually.",
    );
  const query =
    typeof search === "number"
      ? `query($id:Int!){ Character(id:$id){${fields}} }`
      : `query($search:String!){ Page(perPage:5){ characters(search:$search){${fields}} } }`;
  const result = record(
    await providerJson("anilist", new URL("https://graphql.anilist.co"), {
      method: "POST",
      body: JSON.stringify({
        query,
        variables: typeof search === "number" ? { id: search } : { search },
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      limit: 30,
    }),
  );
  if (array(result.errors).length)
    throw new DirectionError(
      "The character catalogue could not complete this lookup. Try again or use manual references.",
    );
  const data = record(result.data);
  const rows =
    typeof search === "number"
      ? [data.Character]
      : array(record(data.Page).characters);
  const candidates = rows.filter(Boolean).map((raw) => {
    const row = record(raw),
      name = record(row.name);
    return characterCandidateSchema.parse({
      id: `anilist:${row.id}`,
      name: string(name.full),
      nativeName: string(name.native),
      aliases: array(name.alternative).filter((v) => typeof v === "string"),
      description: string(row.description)
        .replace(/<[^>]*>/g, "")
        .slice(0, 10000),
      sourceUrl: `https://anilist.co/character/${row.id}`,
      imageUrl: trustedImage(record(row.image).large),
      images: trustedImage(record(row.image).large)
        ? [
            {
              href: trustedImage(record(row.image).large),
              alt: `${string(name.full)} catalogue image`,
              sourceUrl: `https://anilist.co/character/${row.id}`,
              sourceLabel: "AniList character record",
            },
          ]
        : [],
      works: array(record(row.media).nodes).map((rawWork) => {
        const work = record(rawWork),
          title = record(work.title);
        return {
          id: work.id,
          cover: string(record(work.coverImage).large) || null,
          year:
            typeof record(work.startDate).year === "number"
              ? record(work.startDate).year
              : null,
          catalogueId: typeof work.idMal === "number" ? work.idMal : null,
          title: string(title.english) || string(title.romaji),
          adaptation:
            work.type === "MANGA"
              ? "Manga"
              : work.format === "MOVIE"
                ? "Anime film"
                : ["OVA", "ONA", "SPECIAL", "TV_SHORT"].includes(
                      string(work.format),
                    )
                  ? string(work.format)
                  : "TV anime",
          sourceUrl: `https://anilist.co/${work.type === "MANGA" ? "manga" : "anime"}/${work.id}`,
        };
      }),
    });
  });
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 5 * 60_000, candidates });
  return candidates;
}

export async function getCharacterCandidate(id: string) {
  if (!/^anilist:\d+$/.test(id))
    throw new DirectionError("Choose a retrieved character record.");
  const candidate = (await catalogue(Number(id.split(":")[1])))[0];
  if (!candidate)
    throw new DirectionError(
      "The selected character record is no longer available.",
    );
  return candidate;
}

export async function getCharacterWithImages(id: string) {
  const candidate = await getCharacterCandidate(id);
  return { ...candidate, images: await characterCatalogueImages(candidate) };
}

const normalizedTitle = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Catalogues sometimes omit surnames or use the opposite name order. */
async function searchCatalogue(name: string, sourceWork: string) {
  const exact = await catalogue(name);
  if (exact.length) return exact;
  const words = name.trim().split(/\s+/);
  const terms = [
    ...new Set([words.slice(0, -1).join(" "), words.slice(1).join(" ")]),
  ].filter((term) => term.length >= 2 && term !== name);
  const candidates = new Map<string, CharacterCandidate>();
  const source = normalizedTitle(sourceWork);
  for (const term of terms) {
    const matches = await catalogue(term);
    if (!source && matches.length) return matches;
    const matchingWork = matches.filter((candidate) =>
      candidate.works.some((work) => normalizedTitle(work.title) === source),
    );
    if (matchingWork.length) return matchingWork;
    for (const candidate of matches) candidates.set(candidate.id, candidate);
  }
  // A source can have an alternate title. Keep retrieved choices for human
  // confirmation instead of inventing an identity or silently accepting one.
  return [...candidates.values()];
}

/** Catalogue recognition never invokes a text model or loads the full gallery. */
export async function lookupCharacter(
  input: unknown,
): Promise<CharacterLookupResult> {
  const request = z
    .object({
      name: z.string().trim().min(2).max(200),
      sourceWork: z.string().trim().max(200).default(""),
    })
    .parse(input);
  let candidates = await searchCatalogue(request.name, request.sourceWork);
  const source = normalizedTitle(request.sourceWork);
  const matches = source
    ? candidates.filter((candidate) =>
        candidate.works.some((work) => normalizedTitle(work.title) === source),
      )
    : candidates;
  if (matches.length) candidates = matches;
  const chosen = candidates.length === 1 ? candidates[0] : null;
  const work =
    chosen?.works.find((work) => normalizedTitle(work.title) === source) ??
    chosen?.works[0];
  return {
    candidates,
    suggestedId: chosen?.id ?? null,
    suggestedWorkId: work?.id ?? null,
    aiUsed: false,
    notice: null,
  };
}
