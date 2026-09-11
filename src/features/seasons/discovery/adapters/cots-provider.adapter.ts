import { createHash } from "node:crypto";
import {
  cotsProviderEnabled,
  cotsSpendLimit,
  cotsPaidCommitments,
} from "@/features/seasons/discovery/config/cots-provider.config";
import {
  array,
  record,
  string,
  integer,
  providerJson,
  CotsProviderError,
} from "@/features/seasons/discovery/services/cots-provider-http.service";
import {
  extractWikiQuotes,
  plainWikiText,
} from "@/features/seasons/discovery/utils/cots-wikitext.util";
import type {
  ProviderCandidate,
  ProviderPage,
  ProviderQuery,
} from "@/features/seasons/discovery/types/cots-provider.types";

const day = 86_400_000;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const page = (query: ProviderQuery) => Math.max(1, Number(query.cursor) || 1);
const queryText = (q: ProviderQuery) =>
  [q.identity.displayName, q.identity.sourceWork, q.identity.adaptation]
    .filter(Boolean)
    .join(" ");
function candidate(
  provider: string,
  q: ProviderQuery,
  values: Partial<ProviderCandidate>,
): ProviderCandidate {
  return {
    provider,
    externalId: "",
    form: q.kind === "IMAGE" ? "IMAGE" : "QUOTATION",
    title: q.identity.displayName,
    width: null,
    height: null,
    text: null,
    speaker: null,
    sourceUrl: "",
    sourceWork: q.identity.sourceWork,
    sourceDetail: "",
    credit: null,
    license: null,
    evidence: "PROVIDER",
    language: q.identity.language,
    importable: true,
    unavailableReason: null,
    ...values,
  };
}
function done(
  items: ProviderCandidate[],
  next: string | null = null,
): ProviderPage {
  return {
    items,
    next,
    status: items.length ? "AVAILABLE" : "EXHAUSTED",
    message: items.length
      ? ""
      : "No further matching candidates from this source.",
  };
}
function key(name: string, explanation: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new CotsProviderError("SETUP_REQUIRED", explanation);
  return value;
}
function linkPage(
  provider: string,
  q: ProviderQuery,
  url: string,
  message: string,
): ProviderPage {
  return {
    items: [
      candidate(provider, q, {
        form: "SOURCE_LINK",
        externalId: url,
        sourceUrl: url,
        title: "Review the source",
        sourceDetail: message,
        importable: false,
        unavailableReason: "This is a source link, not extracted text.",
      }),
    ],
    next: null,
    status: "SOURCE_LINKS_ONLY",
    message,
  };
}

export function cotsProviderRoute(q: ProviderQuery): string[] {
  const category = q.identity.sourceCategory;
  if (q.kind === "IMAGE") {
    if (category === "anime") return ["zerochan", "serpapi", "brave"];
    if (category === "person") return ["commons", "serpapi", "brave"];
    if (category === "book") return ["serpapi", "brave", "commons"];
    if (category === "game" || category === "comic")
      return ["serpapi", "brave", "zerochan"];
    return ["serpapi", "brave"];
  }
  if (category === "anime") return ["wikiquote", "animechan"];
  if (category === "tv" || category === "movie")
    return ["wikiquote", "clipcafe"];
  if (category === "person") return ["wikiquote", "stands4"];
  if (category === "book") return ["wikiquote", "wikisource"];
  return ["wikiquote", "community"];
}

export async function fetchCotsProvider(
  provider: string,
  q: ProviderQuery,
): Promise<ProviderPage> {
  if (!cotsProviderEnabled(provider))
    throw new CotsProviderError(
      "SETUP_REQUIRED",
      "This source is disabled in Become’s provider configuration.",
    );
  if (provider === "commons") {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: queryText(q),
      gsrlimit: "20",
      gsroffset: String((page(q) - 1) * 20),
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: "1400",
    }).toString();
    const body = record(await providerJson("wikimedia", url));
    const items = Object.values(record(record(body.query).pages)).flatMap(
      (raw) => {
        const row = record(raw),
          info = record(array(row.imageinfo)[0]),
          meta = record(info.extmetadata);
        const original = string(info.thumburl) || string(info.url);
        if (!original) return [];
        return [
          candidate(provider, q, {
            externalId: String(row.pageid),
            sourceUrl: string(info.descriptionurl),
            originalUrl: original,
            previewUrl: original,
            width: integer(info.thumbwidth) ?? integer(info.width),
            height: integer(info.thumbheight) ?? integer(info.height),
            title: string(row.title).replace(/^File:/, ""),
            credit: plainWikiText(string(record(meta.Artist).value)) || null,
            license: string(record(meta.LicenseShortName).value) || null,
            sourceDetail:
              "Wikimedia file record; confirm the depicted subject.",
          }),
        ];
      },
    );
    return done(items, body.continue ? String(page(q) + 1) : null);
  }
  if (provider === "zerochan") {
    const username = key(
      "COTS_ZEROCHAN_USERNAME",
      "Zerochan needs a real account username for its identifying User-Agent.",
    );
    // Resolve the supplied name through the tag endpoint, then require returned tag evidence.
    // Optional alias configuration helps tags whose canonical label differs from the chosen name.
    let tags: Record<string, string> = {};
    try {
      tags = JSON.parse(process.env.COTS_ZEROCHAN_TAGS_JSON || "{}");
    } catch {
      /* No unverified guessed tag. */
    }
    const tag =
      tags[[q.identity.displayName, q.identity.sourceWork].join("|")] ??
      tags[q.identity.displayName] ??
      q.identity.displayName;
    if (!tag || typeof tag !== "string")
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "Check the canonical character tag alias configuration.",
      );
    const url = new URL(`https://www.zerochan.net/${encodeURIComponent(tag)}`);
    url.search = new URLSearchParams({
      json: "",
      p: String(page(q)),
      l: "20",
      s: "fav",
    }).toString();
    const body = record(
      await providerJson(provider, url, {
        headers: { "User-Agent": `Become/1.0 - ${username}` },
        limit: 50,
      }),
    );
    const items = array(body.items).flatMap((raw) => {
      const row = record(raw),
        id = integer(row.id),
        original = string(row.full) || string(row.large);
      const foundTags = [
        string(row.tag),
        ...array(row.tags).map((v) =>
          typeof v === "string" ? v : string(record(v).name),
        ),
      ];
      if (!id || !foundTags.some((v) => v.toLowerCase() === tag.toLowerCase()))
        return [];
      return [
        candidate(provider, q, {
          externalId: String(id),
          sourceUrl: `https://www.zerochan.net/${id}`,
          originalUrl: original || undefined,
          previewUrl: string(row.thumbnail) || undefined,
          width: integer(row.width),
          height: integer(row.height),
          sourceDetail: `Matched character tag: ${tag}. ${foundTags.slice(0, 8).join(", ")}. Item detail is resolved on import.`,
          credit: string(row.artist) || null,
        }),
      ];
    });
    return done(
      items,
      array(body.items).length === 20 ? String(page(q) + 1) : null,
    );
  }
  if (provider === "serpapi") {
    const token = key(
      "COTS_SERPAPI_API_KEY",
      "Google Images discovery needs a SerpApi API key; the free plan advertises 250 searches/month.",
    );
    const url = new URL("https://serpapi.com/search.json");
    url.search = new URLSearchParams({
      engine: "google_images",
      q: queryText(q),
      api_key: token,
      safe: "active",
      nfpr: "1",
      ijn: String(page(q) - 1),
    }).toString();
    const commitments = cotsPaidCommitments();
    if (commitments.serpapi && commitments.total > cotsSpendLimit())
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "The configured paid plan exceeds Become’s approved monthly budget.",
      );
    const body = record(
      await providerJson(provider, url, {
        limit: commitments.serpapi ? 1000 : 250,
        windowMs: 31 * day,
      }),
    );
    if (body.error)
      throw new CotsProviderError(
        "UNAVAILABLE",
        "The image search service did not return usable results.",
      );
    const items = array(body.images_results).flatMap((raw) => {
      const row = record(raw);
      const original = string(row.original),
        source = string(row.link);
      if (!original || !source) return [];
      return [
        candidate(provider, q, {
          externalId: hash(original),
          title: string(row.title),
          sourceUrl: source,
          originalUrl: original,
          previewUrl: string(row.thumbnail) || undefined,
          width: integer(row.original_width),
          height: integer(row.original_height),
          sourceDetail: string(row.source),
        }),
      ];
    });
    return done(
      items,
      record(body.serpapi_pagination).next && page(q) < 100
        ? String(page(q) + 1)
        : null,
    );
  }
  if (provider === "brave") {
    const token = key(
      "COTS_BRAVE_SEARCH_API_KEY",
      "Independent image fallback needs a Brave Search API key and storage-enabled entitlement.",
    );
    if (process.env.COTS_BRAVE_STORAGE_ALLOWED !== "true")
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "Confirm Brave result-storage entitlement before enabling saved candidates.",
      );
    const url = new URL("https://api.search.brave.com/res/v1/images/search");
    url.search = new URLSearchParams({
      q: queryText(q),
      count: "100",
      safesearch: "strict",
    }).toString();
    const body = record(
      await providerJson(provider, url, {
        headers: { "X-Subscription-Token": token },
        limit: Math.min(
          1000,
          Math.floor(
            Math.max(0, cotsSpendLimit() - cotsPaidCommitments().total) * 200,
          ),
        ),
        windowMs: 31 * day,
      }),
    );
    return done(
      array(body.results).flatMap((raw) => {
        const row = record(raw),
          properties = record(row.properties),
          original = string(properties.url);
        if (!original) return [];
        return [
          candidate(provider, q, {
            externalId: hash(original),
            title: string(row.title),
            sourceUrl: string(row.url),
            originalUrl: original,
            previewUrl: string(record(row.thumbnail).src) || original,
            width: integer(properties.width),
            height: integer(properties.height),
            sourceDetail: "Brave independently indexed image result.",
          }),
        ];
      }),
    );
  }
  if (provider === "animechan") {
    const url = new URL("https://api.animechan.io/v1/quotes");
    url.search = new URLSearchParams({
      character: q.identity.displayName,
      page: String(page(q)),
    }).toString();
    const body = record(
      await providerJson(provider, url, { limit: 5, windowMs: 3_600_000 }),
    );
    const items = array(body.data).flatMap((raw) => {
      const row = record(raw),
        character = record(row.character),
        anime = record(row.anime);
      if (
        string(character.name).toLowerCase() !==
        q.identity.displayName.toLowerCase()
      )
        return [];
      const work = string(anime.name),
        alt = string(anime.altName);
      const normalize = (v: string) =>
        v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (
        q.identity.sourceWork &&
        ![work, alt].some(
          (v) => normalize(v) === normalize(q.identity.sourceWork),
        )
      )
        return [];
      const text = string(row.content);
      return text && text.length <= 2000
        ? [
            candidate(provider, q, {
              externalId: hash(`${character.id}:${text}`),
              text,
              speaker: string(character.name),
              sourceWork: work,
              sourceUrl: "https://animechan.io/",
              sourceDetail:
                "Provider-attributed; episode and translation not supplied.",
            }),
          ]
        : [];
    });
    return done(
      items,
      array(body.data).length === 5 ? String(page(q) + 1) : null,
    );
  }
  if (provider === "wikiquote") {
    const baseTitle =
      q.identity.sourceCategory === "person"
        ? q.identity.displayName
        : q.identity.sourceWork || q.identity.displayName;
    let title =
      q.identity.sourceCategory === "comic"
        ? `${q.identity.displayName} (comics)`
        : baseTitle;
    const url = new URL("https://en.wikiquote.org/w/api.php");
    const cursor = q.cursor?.startsWith("{")
      ? (JSON.parse(q.cursor) as {
          revision?: number;
          offset: number;
          title?: string;
          remaining?: string[];
        })
      : null;
    title = cursor?.title || title;
    const read = async (pageTitle: string, revision?: number) => {
      url.search = new URLSearchParams({
        action: "parse",
        format: "json",
        ...(revision ? { oldid: String(revision) } : { page: pageTitle }),
        prop: "wikitext|revid|links|categories",
        redirects: "1",
      }).toString();
      return record(
        record(await providerJson("wikimedia", new URL(url))).parse,
      );
    };
    let parsed = await read(title, cursor?.revision);
    const isFilm = (v: Record<string, unknown>) =>
      array(v.categories).some((c) =>
        /\bfilms\b/i.test(string(record(c)["*"])),
      );
    let remaining = cursor?.remaining ?? [];
    if (
      !cursor &&
      (q.identity.sourceCategory === "tv" ||
        q.identity.sourceCategory === "movie")
    ) {
      // Follow actual work/season links from the returned page, never invent a season or adaptation URL.
      const linked = array(parsed.links)
        .map((v) => string(record(v)["*"]))
        .filter(
          (v) =>
            v.toLowerCase().startsWith(baseTitle.toLowerCase()) &&
            (q.identity.sourceCategory === "tv"
              ? /\(season \d+\)/i.test(v)
              : /\((?:movies|.*film.*)\)|:\s/.test(v)),
        )
        .filter(
          (v) =>
            !q.identity.adaptation ||
            v.toLowerCase().includes(q.identity.adaptation.toLowerCase()),
        )
        .slice(0, 20);
      if (
        linked.length &&
        (q.identity.sourceCategory === "tv" || !isFilm(parsed))
      ) {
        [title, ...remaining] = [...new Set(linked)];
        parsed = await read(title);
      }
    }
    const wikitext = string(record(parsed.wikitext)["*"]);
    const all =
      q.identity.sourceCategory === "movie" && !isFilm(parsed)
        ? []
        : extractWikiQuotes(
            wikitext,
            q.identity.displayName,
            q.identity.sourceCategory === "person",
          );
    const revision = String(parsed.revid ?? "");
    const sourceUrl = `https://en.wikiquote.org/wiki/${encodeURIComponent(string(parsed.title) || title)}`;
    const offset = cursor?.offset ?? 0;
    const next =
      offset + 12 < all.length
        ? JSON.stringify({
            revision: Number(parsed.revid),
            offset: offset + 12,
            title: string(parsed.title) || title,
            remaining,
          })
        : remaining.length
          ? JSON.stringify({
              title: remaining[0],
              remaining: remaining.slice(1),
              offset: 0,
            })
          : null;
    const items = all.slice(offset, offset + 12).map((row) =>
      candidate(provider, q, {
        externalId: hash(`${sourceUrl}:${revision}:${row.text}`),
        text: row.text,
        speaker: row.speaker,
        form: row.dialogue ? "DIALOGUE_TURN" : "QUOTATION",
        sourceUrl,
        sourceWork: string(parsed.title) || title,
        sourceDetail: `${row.detail} · revision ${revision}`,
        evidence: row.unresolved ? "UNRESOLVED" : "COMMUNITY",
      }),
    );
    if (!items.length && wikitext) {
      const review = linkPage(
        provider,
        q,
        sourceUrl,
        "Review this work’s sections and source details. No supported explicit speaker lines were extracted.",
      );
      return { ...review, next };
    }
    return done(items, next);
  }
  if (provider === "wikisource") {
    const title = q.identity.sourceWork || q.identity.displayName;
    if (!q.identity.adaptation)
      return linkPage(
        provider,
        q,
        `https://en.wikisource.org/wiki/${encodeURIComponent(title)}`,
        "Add the intended edition or chapter in Identity before retrieving passages. Narration is not automatically character dialogue.",
      );
    const cursor = q.cursor?.startsWith("{")
      ? (JSON.parse(q.cursor) as {
          revision: number;
          offset: number;
          edition: string;
        })
      : null;
    let edition = cursor?.edition ?? "";
    if (!edition) {
      const search = new URL("https://en.wikisource.org/w/api.php");
      search.search = new URLSearchParams({
        action: "query",
        format: "json",
        list: "search",
        srsearch: `${title} ${q.identity.adaptation}`,
        srlimit: "5",
        srnamespace: "0",
      }).toString();
      const matches = array(
        record(record(await providerJson("wikimedia", search)).query).search,
      ).map(record);
      const selected = matches.find((v) =>
        string(v.title).toLowerCase().includes(title.toLowerCase()),
      );
      if (!selected) return done([]);
      edition = string(selected.title);
    }
    const url = new URL("https://en.wikisource.org/w/api.php");
    url.search = new URLSearchParams({
      action: "parse",
      format: "json",
      ...(cursor ? { oldid: String(cursor.revision) } : { page: edition }),
      prop: "text|revid",
      redirects: "1",
    }).toString();
    const parsed = record(record(await providerJson("wikimedia", url)).parse);
    const html = string(record(parsed.text)["*"]);
    const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((v) => plainWikiText(v[1]).replace(/\s+/g, " "))
      .filter(
        (v) =>
          v.length >= 80 &&
          v.length <= 1600 &&
          v
            .toLowerCase()
            .includes(q.identity.displayName.split(" ").at(-1)!.toLowerCase()),
      );
    const offset = cursor?.offset ?? 0,
      sourceUrl = `https://en.wikisource.org/wiki/${encodeURIComponent(edition)}`;
    if (!paragraphs.length)
      return linkPage(
        provider,
        q,
        sourceUrl,
        "This edition needs a chapter selection before supported passages can be extracted.",
      );
    return done(
      paragraphs.slice(offset, offset + 10).map((text) =>
        candidate(provider, q, {
          form: "PASSAGE",
          externalId: hash(`${edition}:${parsed.revid}:${text}`),
          text,
          speaker: null,
          sourceUrl,
          sourceWork: edition,
          evidence: "COMMUNITY",
          sourceDetail: `Contiguous edition paragraph · revision ${parsed.revid}. Includes the named subject; not attributed as their speech.`,
        }),
      ),
      offset + 10 < paragraphs.length
        ? JSON.stringify({
            revision: Number(parsed.revid),
            offset: offset + 10,
            edition,
          })
        : null,
    );
  }
  if (provider === "community") {
    const knownWiki =
      q.identity.sourceCategory === "game" &&
      /red dead redemption/i.test(q.identity.sourceWork)
        ? "reddead"
        : q.identity.sourceCategory === "comic" &&
            /\bdc\b|batman/i.test(queryText(q))
          ? "dc"
          : null;
    return linkPage(
      provider,
      q,
      knownWiki
        ? `https://${knownWiki}.fandom.com/wiki/Special:Search?query=${encodeURIComponent(`${q.identity.displayName} quotes ${q.identity.adaptation}`)}`
        : `https://www.fandom.com/?s=${encodeURIComponent(queryText(q))}`,
      "Game/comic community transcript automation remains disabled pending source permission. Review a supported original source; source links are not extracted quotations.",
    );
  }
  if (provider === "stands4") {
    const uid = key(
        "COTS_STANDS4_UID",
        "Public-figure fallback needs STANDS4 user ID and token.",
      ),
      token = key(
        "COTS_STANDS4_TOKEN_ID",
        "Public-figure fallback needs a STANDS4 token.",
      );
    if (process.env.COTS_STANDS4_RETENTION_ALLOWED !== "true")
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "Confirm STANDS4 retention and attribution terms before storing returned quotations.",
      );
    const url = new URL("https://www.stands4.com/services/v2/quotes.php");
    url.search = new URLSearchParams({
      uid,
      tokenid: token,
      searchtype: "AUTHOR",
      query: q.identity.displayName,
      format: "json",
    }).toString();
    const body = await providerJson(provider, url, {
      limit: 90,
      windowMs: day,
    });
    const rows = Array.isArray(body)
      ? body
      : array(record(record(body).results).result);
    return done(
      rows.flatMap((raw) => {
        const row = record(raw),
          text = string(row.quote),
          author = string(row.author);
        return text &&
          text.length <= 2000 &&
          author.toLowerCase() === q.identity.displayName.toLowerCase()
          ? [
              candidate(provider, q, {
                externalId: hash(text),
                text,
                speaker: author,
                sourceUrl: "https://www.quotes.net/",
                sourceDetail:
                  "Provider author attribution; original source not independently verified.",
              }),
            ]
          : [];
      }),
    );
  }
  if (provider === "clipcafe") {
    const token = key(
      "COTS_CLIPCAFE_API_KEY",
      "TV/movie dialogue fallback needs a Clip.Cafe API key and verified PRO API entitlement.",
    );
    if (
      cotsPaidCommitments().clipcafe <= 0 ||
      cotsPaidCommitments().total > cotsSpendLimit() ||
      process.env.COTS_CLIPCAFE_RETENTION_ALLOWED !== "true"
    )
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "Clip.Cafe needs approved paid access, actual monthly cost including tax, and transcript retention entitlement.",
      );
    const url = new URL("https://api.clip.cafe/");
    url.search = new URLSearchParams({
      api_key: token,
      characters: q.identity.displayName,
      movie_title: q.identity.sourceWork,
      size: "10",
      from: String((page(q) - 1) * 10),
    }).toString();
    const body = await providerJson(provider, url, {
      limit: 1800,
      windowMs: 31 * day,
    });
    const hits = record(record(body).hits);
    const rows = array(hits.hits).map((v) => record(record(v)._source));
    const items: ProviderCandidate[] = [];
    for (const raw of rows) {
      const row = record(raw),
        transcript = string(row.transcript),
        work = string(row.movie_title);
      if (
        q.identity.sourceWork &&
        work.toLowerCase() !== q.identity.sourceWork.toLowerCase()
      )
        continue;
      let speaker = "",
        words: string[] = [];
      const flush = () => {
        const text = words.join(" ").trim();
        if (
          speaker.toLowerCase() === q.identity.displayName.toLowerCase() &&
          text.length >= 2 &&
          text.length <= 2000 &&
          !text.includes("...")
        )
          items.push(
            candidate(provider, q, {
              form: "DIALOGUE_TURN",
              externalId: hash(`${row.clipID}:${speaker}:${text}`),
              text,
              speaker,
              sourceUrl: `https://clip.cafe/${encodeURIComponent(string(row.movie_slug))}/${encodeURIComponent(string(row.slug))}/`,
              sourceWork: work,
              sourceDetail: `Explicit speaker turn · ${row.movie_year ?? ""} · season ${row.season ?? ""}, episode ${row.episode ?? ""}. Review the source.`,
            }),
          );
        words = [];
      };
      for (const line of transcript.split("\n")) {
        const turn = line.trim().match(/^([^:]{1,100}):\s*(.*)$/);
        if (turn) {
          flush();
          speaker = turn[1].trim();
          if (turn[2]) words.push(turn[2].split(" | ")[0]);
        } else if (speaker && line.trim() && !/^\[.*\]$/.test(line.trim()))
          words.push(line.trim().split(" | ")[0]);
      }
      flush();
    }
    return done(items, rows.length === 10 ? String(page(q) + 1) : null);
  }
  throw new CotsProviderError(
    "SETUP_REQUIRED",
    "This optional provider is not enabled.",
  );
}
