/** Offline CLI trial only. Nothing in the application imports this module. */
import { mkdir, readFile, rename, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const benchmarks = [
  { characterId: 45627, workId: 16498, label: "Levi Ackerman" },
  { characterId: 35252, workId: 9253, label: "Okabe Rintarou" },
  { characterId: 268676, workId: 181444, label: "Kaoruko Waguri" },
];
const workSchema = z.object({
  id: z.number().int(),
  title: z.object({
    english: z.string().nullable(),
    romaji: z.string(),
    native: z.string().nullable(),
  }),
  format: z.string(),
  startDate: z.object({ year: z.number().nullable() }),
  externalLinks: z.array(
    z.object({ site: z.string(), type: z.string(), url: z.string() }),
  ),
});
const characterSchema = z.object({
  id: z.number().int(),
  name: z.object({ full: z.string(), native: z.string().nullable() }),
  media: z.object({ nodes: z.array(workSchema) }),
});
const imageSchema = z.object({
  url: z.string(),
  description: z.string().nullish(),
});
const responseSchema = z.object({
  request_id: z.string().optional(),
  usage: z.object({ credits: z.number() }).optional(),
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().default(""),
      content: z.string().default(""),
      images: z.array(imageSchema).nullish(),
    }),
  ),
});
const searchSchema = z.object({
  query: z.string(),
  groupRequested: z.enum(["Official character art", "From the show"]),
  status: z.enum(["RESERVED", "READY", "FAILED"]),
  milliseconds: z.number(),
  response: responseSchema.optional(),
  error: z.string().optional(),
});
const catalogueQuery = `query($characterId:Int!){Character(id:$characterId){id name{full native} media(perPage:50,type:ANIME){nodes{id title{english romaji native} format startDate{year} externalLinks{site type url}}}}}`;

function publicUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) ||
      /\.(localhost|local|internal|test|invalid)$/i.test(url.hostname)
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
function allowedSource(value: string, domains: string[]) {
  const url = publicUrl(value);
  return (
    url &&
    domains.some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    )
  );
}
async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return null;
    throw error;
  }
}
async function saveJson(path: string, value: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2), {
    mode: 0o600,
  });
  await rename(`${path}.tmp`, path);
}
async function requestJson(
  fetcher: typeof fetch,
  url: string,
  body: unknown,
  apiKey?: string,
) {
  const response = await fetcher(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await response.body?.cancel();
    // Provider error bodies can echo request details. Persist only the status code.
    throw new Error(`HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty provider response");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 2_000_000) {
        await reader.cancel();
        throw new Error("Response too large");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export async function runCharacterSourceTrial({
  apiKey,
  directory,
  fetcher = fetch,
}: {
  apiKey: string;
  directory: string;
  fetcher?: typeof fetch;
}) {
  if (!apiKey.trim())
    throw new Error("Set TAVILY_API_KEY in .env before running the trial.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, "running.lock");
  try {
    await mkdir(lock);
  } catch {
    throw new Error(
      "A trial is already running, or its lock needs inspection after an interruption.",
    );
  }
  const started = performance.now();
  const characters = [];
  try {
    for (const benchmark of benchmarks) {
      const folder = join(
        directory,
        `${benchmark.characterId}-${benchmark.workId}`,
      );
      await mkdir(folder, { recursive: true, mode: 0o700 });
      const catalogueFile = join(folder, "catalogue.json");
      let raw = await readJson(catalogueFile);
      if (!raw) {
        raw = await requestJson(fetcher, "https://graphql.anilist.co", {
          query: catalogueQuery,
          variables: { characterId: benchmark.characterId },
        });
        await saveJson(catalogueFile, raw);
      }
      const { data } = z
        .object({ data: z.object({ Character: characterSchema }) })
        .parse(raw);
      if (data.Character.id !== benchmark.characterId)
        throw new Error("Catalogue identity mismatch.");
      const work = data.Character.media.nodes.find(
        (row) => row.id === benchmark.workId,
      );
      if (!work)
        throw new Error(
          "Benchmark adaptation is not attached to this character.",
        );
      const domains = [
        ...new Set(
          work.externalLinks
            .filter(
              (link) => link.site === "Official Site" && link.type === "INFO",
            )
            // Some catalogue links still use HTTP. Search HTTPS pages; do not fetch the HTTP endpoint.
            .map(
              (link) =>
                publicUrl(link.url.replace(/^http:/, "https:"))?.hostname,
            )
            .filter((domain): domain is string => Boolean(domain)),
        ),
      ];
      if (!domains.length)
        throw new Error(
          `No catalogue-linked official site for ${benchmark.label}.`,
        );
      const title = work.title.english || work.title.romaji;
      const queries = [
        [
          "Official character art",
          `${data.Character.name.full} ${title} official character visual`,
        ],
        [
          "Official character art",
          `${data.Character.name.native || data.Character.name.full} ${work.title.native || work.title.romaji} キャラクター`,
        ],
        [
          "Official character art",
          `${data.Character.name.full} ${title} character design illustration`,
        ],
        ["From the show", `${data.Character.name.full} ${title} episode still`],
        [
          "From the show",
          `${data.Character.name.native || data.Character.name.full} ${work.title.native || work.title.romaji} 場面カット`,
        ],
        [
          "From the show",
          `${data.Character.name.full} ${title} story screenshot`,
        ],
      ] as const;
      const searches = [];
      for (const [index, [groupRequested, query]] of queries.entries()) {
        const path = join(folder, `search-${index}.json`);
        const stored = await readJson(path);
        if (stored) {
          searches.push({ ...searchSchema.parse(stored), cacheHit: true });
          continue;
        }
        const pending = {
          query,
          groupRequested,
          status: "RESERVED" as const,
          milliseconds: 0,
        };
        // Write before dispatch: a crash/timeout must not spend another credit on the same search.
        await writeFile(path, JSON.stringify(pending), {
          flag: "wx",
          mode: 0o600,
        });
        const start = performance.now();
        let receipt: z.infer<typeof searchSchema>;
        try {
          const response = responseSchema.parse(
            await requestJson(
              fetcher,
              "https://api.tavily.com/search",
              {
                query,
                topic: "general",
                search_depth: "basic",
                auto_parameters: false,
                include_images: true,
                include_image_descriptions: true,
                include_raw_content: false,
                include_answer: false,
                include_usage: true,
                include_domains: domains,
                include_domains_mode: "restrict",
                max_results: 8,
                safe_search: true,
              },
              apiKey,
            ),
          );
          receipt = {
            ...pending,
            status: "READY",
            milliseconds: performance.now() - start,
            response,
          };
        } catch (error) {
          const status =
            error instanceof Error && /^HTTP \d+$/.test(error.message)
              ? error.message
              : "Request failed or returned an invalid response";
          receipt = {
            ...pending,
            status: "FAILED",
            milliseconds: performance.now() - start,
            error: status,
          };
        }
        await saveJson(path, receipt);
        searches.push({ ...receipt, cacheHit: false });
        if (
          receipt.error &&
          /^HTTP (401|402|403|429|432|433)$/.test(receipt.error)
        ) {
          throw new Error(
            `Tavily ${receipt.error}; trial stopped. Check access, free credits and account limits. The attempted search will not be repeated automatically.`,
          );
        }
      }
      const unique = new Map<
        string,
        {
          imageUrl: string;
          description: string;
          sourceUrl: string;
          sourceTitle: string;
          context: string;
          requestedGroups: string[];
          review: "UNVERIFIED";
        }
      >();
      for (const search of searches)
        for (const result of search.response?.results ?? []) {
          if (!allowedSource(result.url, domains)) continue;
          // Intentionally ignore the top-level images array: it has no page provenance.
          for (const image of result.images ?? []) {
            const url = publicUrl(image.url);
            if (!url) continue;
            url.hash = "";
            const existing = unique.get(url.href);
            if (existing) {
              if (!existing.requestedGroups.includes(search.groupRequested))
                existing.requestedGroups.push(search.groupRequested);
            } else
              unique.set(url.href, {
                imageUrl: url.href,
                description: image.description ?? "",
                sourceUrl: result.url,
                sourceTitle: result.title,
                context: result.content,
                requestedGroups: [search.groupRequested],
                review: "UNVERIFIED",
              });
          }
        }
      characters.push({
        ...benchmark,
        title,
        format: work.format,
        year: work.startDate.year,
        domains,
        searches,
        images: [...unique.values()],
      });
    }
    const report = {
      createdAt: new Date().toISOString(),
      qualityGate: "AWAITING_VISUAL_REVIEW" as const,
      milliseconds: performance.now() - started,
      maxBasicSearches: 18,
      characters,
    };
    await saveJson(join(directory, "report.json"), report);
    return report;
  } finally {
    await rmdir(lock);
  }
}
