import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import profiles from "./benchmark-profiles.json";
import { extractImageUrls, validateOfficialUrl } from "./extraction";
import {
  reportSchema,
  type TrialCharacter,
  type TrialReference,
  type TrialWork,
} from "./types";
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const catalogueQuery = `query($id:Int!){Character(id:$id){id name{full native} media(perPage:50){nodes{id type format title{english romaji} startDate{year} coverImage{large}}}}}`;

export async function runOfficialReferenceTrial({
  directory,
  fresh = false,
  fetcher = fetch,
  signal,
  benchmarks = profiles,
}: {
  directory: string;
  fresh?: boolean;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  benchmarks?: typeof profiles;
}) {
  await mkdir(join(directory, "cache"), { recursive: true, mode: 0o700 });
  await mkdir(join(directory, "images"), { recursive: true, mode: 0o700 });
  const lock = join(directory, "running.lock");
  try {
    await mkdir(lock);
  } catch {
    throw new Error(
      "Official reference trial is already running; inspect an interrupted lock before retrying.",
    );
  }
  let requests = 0,
    cacheHits = 0;
  const started = performance.now();
  async function bytes(url: string, catalogueId?: number) {
    signal?.throwIfAborted();
    validateOfficialUrl(url);
    const cachePath = join(
      directory,
      "cache",
      hash(`${url}:${catalogueId ?? ""}`),
    );
    if (!fresh) {
      try {
        const result = await readFile(cachePath);
        cacheHits++;
        return result;
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw error;
      }
    }
    if (++requests > 32) throw new Error("Trial request cap reached");
    const response = await fetcher(url, {
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(12_000),
        ...(signal ? [signal] : []),
      ]),
      headers: {
        "User-Agent": "Become reference trial",
        ...(catalogueId ? { "Content-Type": "application/json" } : {}),
      },
      ...(catalogueId
        ? {
            method: "POST",
            body: JSON.stringify({
              query: catalogueQuery,
              variables: { id: catalogueId },
            }),
          }
        : {}),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Source HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Source is empty");
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        total += part.value.length;
        if (total > 8_000_000) {
          await reader.cancel();
          throw new Error("Source exceeds the trial size limit");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = Buffer.concat(chunks);
    await writeFile(`${cachePath}.tmp`, result, { mode: 0o600 });
    await rename(`${cachePath}.tmp`, cachePath);
    return result;
  }
  try {
    const characters: TrialCharacter[] = [];
    for (const profile of benchmarks) {
      const start = performance.now();
      const warnings: string[] = [];
      let name = profile.label,
        nativeName = "";
      let works: TrialWork[] = [];
      try {
        const parsed = JSON.parse(
          (
            await bytes("https://graphql.anilist.co", profile.characterId)
          ).toString(),
        );
        const character = parsed.data?.Character;
        if (
          character?.id !== profile.characterId ||
          !character.media?.nodes?.some(
            (work: { id: number }) => work.id === profile.workId,
          )
        )
          throw new Error(
            "The catalogue no longer binds this character to the benchmark adaptation",
          );
        name = character.name.full;
        nativeName = character.name.native ?? "";
        works = character.media.nodes.map(
          (work: {
            id: number;
            type: string;
            format: string;
            title: { english?: string; romaji: string };
            startDate: { year: number | null };
            coverImage: { large?: string };
          }) => {
            let cover = work.coverImage?.large ?? null;
            if (
              cover &&
              !(
                cover.startsWith(
                  "https://s4.anilist.co/file/anilistcdn/media/",
                ) ||
                cover.startsWith(
                  "https://s4.anilist.co/file/anilistcdn/media/anime/",
                )
              )
            )
              cover = null;
            return {
              id: work.id,
              title: work.title.english || work.title.romaji,
              medium:
                work.type === "MANGA"
                  ? "Manga"
                  : work.format === "TV"
                    ? "TV anime"
                    : work.format === "MOVIE"
                      ? "Anime film"
                      : work.format,
              year: work.startDate?.year ?? null,
              cover,
            };
          },
        );
      } catch {
        warnings.push(
          "Catalogue verification unavailable; no images accepted.",
        );
      }
      const discovered = new Set<string>();
      const verifiedPages = new Set<string>();
      // At most three independent public source requests at once.
      for (
        let offset = 0;
        works.length && offset < profile.pages.length;
        offset += 3
      ) {
        const pages = await Promise.all(
          profile.pages.slice(offset, offset + 3).map(async (page) => {
            try {
              const text = (await bytes(page.url)).toString("utf8");
              if (
                !page.contains.every((anchor) =>
                  text
                    .replaceAll("&copy;", "©")
                    .replaceAll("&#169;", "©")
                    .includes(anchor),
                )
              )
                throw new Error("Source context changed");
              return {
                url: page.url,
                images: extractImageUrls(text, page.url, page.kind),
              };
            } catch {
              warnings.push(
                `Source unavailable or changed: ${new URL(page.url).hostname}${new URL(page.url).pathname}`,
              );
              return null;
            }
          }),
        );
        for (const page of pages)
          if (page) {
            verifiedPages.add(page.url);
            for (const url of page.images) discovered.add(url);
          }
      }
      const accepted: TrialReference[] = [];
      const seen = new Set<string>();
      const expected = profile.references.filter((reference) =>
        discovered.has(reference.url),
      );
      for (let offset = 0; offset < expected.length; offset += 3) {
        const results = await Promise.all(
          expected
            .slice(offset, offset + 3)
            .map(async (reference): Promise<TrialReference | null> => {
              try {
                // An inspected fingerprint is a trial fixture, not a claim that all extracted images are authentic.
                const imageBytes = await bytes(reference.url);
                const digest = hash(imageBytes);
                if (digest !== reference.sha256)
                  throw new Error("Image needs a new visual review");
                const image = sharp(imageBytes, {
                  limitInputPixels: 20_000_000,
                });
                const meta = await image.metadata();
                if (
                  !meta.width ||
                  !meta.height ||
                  meta.width < 320 ||
                  meta.height < 180 ||
                  meta.width !== reference.width ||
                  meta.height !== reference.height
                )
                  throw new Error("Image dimensions changed");
                const preview = await image
                  .resize({
                    width: 1400,
                    height: 1400,
                    fit: "inside",
                    withoutEnlargement: true,
                  })
                  .webp({ quality: 86 })
                  .toBuffer();
                await writeFile(
                  join(directory, "images", `${digest}.webp`),
                  preview,
                  { mode: 0o600 },
                );
                return {
                  id: digest,
                  label: reference.label,
                  url: reference.url,
                  sourceUrl: reference.sourceUrl,
                  group:
                    reference.group === "From the show"
                      ? "From the show"
                      : "Official character art",
                  width: meta.width,
                  height: meta.height,
                };
              } catch {
                warnings.push(
                  `Image unavailable, changed or needs inspection: ${reference.label}`,
                );
                return null;
              }
            }),
        );
        for (const result of results)
          if (result && !seen.has(result.id)) {
            seen.add(result.id);
            accepted.push(result);
          }
      }
      if (
        profile.characterId === 35252 &&
        (!verifiedPages.has(
          "https://kadokawa-animation.jp/lineup/steinsgate",
        ) ||
          !verifiedPages.has("https://www.b-ch.com/titles/2985/"))
      ) {
        accepted.length = 0;
        warnings.push(
          "Publisher/distributor continuity could not be verified.",
        );
      }
      const gate =
        accepted.length >= 4 &&
        accepted.some((ref) => ref.group === "Official character art") &&
        accepted.some((ref) => ref.group === "From the show")
          ? "PASS"
          : "INCOMPLETE";
      characters.push({
        characterId: profile.characterId,
        workId: profile.workId,
        name,
        nativeName,
        works,
        references: accepted,
        warnings,
        gate,
        milliseconds: performance.now() - start,
      });
    }
    const report = reportSchema.parse({
      createdAt: new Date().toISOString(),
      milliseconds: performance.now() - started,
      requests,
      cacheHits,
      characters,
      gate: characters.every((c) => c.gate === "PASS") ? "PASS" : "INCOMPLETE",
    });
    await writeFile(
      join(directory, "report.json.tmp"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    await rename(
      join(directory, "report.json.tmp"),
      join(directory, "report.json"),
    );
    return report;
  } finally {
    await rmdir(lock);
  }
}
