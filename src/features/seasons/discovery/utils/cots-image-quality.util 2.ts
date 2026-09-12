import { createHash } from "node:crypto";
import type { CotsIdentityView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import {
  cotsSafeImageSearchSuffix,
  hasUnsafeCotsImageMetadata,
} from "@/features/seasons/discovery/utils/cots-image-safety.util";

const SEARCH_CONTEXT: Record<
  NonNullable<CotsIdentityView["sourceCategory"]>,
  string
> = {
  anime: "anime character",
  tv: "TV character",
  movie: "movie character",
  game: "video game character",
  book: "book character illustration",
  comic: "comic character",
  person: "portrait photograph",
};

const IDENTITY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "de",
  "der",
  "la",
  "of",
  "the",
  "van",
  "von",
]);

const OBVIOUS_JUNK = new RegExp(
  `\\b(?:${[
    "anatomy",
    "badge",
    "chart",
    "clip[ -]?art",
    "diagram",
    "emblem",
    "family tree",
    "flag",
    "flow[ -]?chart",
    "font",
    "icon",
    "info[ -]?graphic",
    "logo",
    "map",
    "palette",
    "schematic",
    "symbol",
    "template",
    "time[ -]?line",
    "typography",
    "vector",
  ].join("|")})\\b`,
  "i",
);

const OBJECT_OR_MERCHANDISE = new RegExp(
  `\\b(?:${[
    "action figure",
    "album cover",
    "book cover",
    "costume",
    "cosplay",
    "dvd cover",
    "figurine",
    "funko",
    "helmet",
    "merch(?:andise)?",
    "mug",
    "phone case",
    "poster",
    "prop",
    "shirt",
    "statue",
    "toy",
    "wall decal",
    "weapon",
  ].join("|")})\\b`,
  "i",
);

const GROUP_OR_ARTICLE_GRAPHIC = new RegExp(
  `\\b(?:${[
    "article graphic",
    "cast photo",
    "character list",
    "collage",
    "ensemble",
    "group photo",
    "meme",
    "quote card",
    "relationship chart",
  ].join("|")})\\b`,
  "i",
);

const TRANSFORM_QUERY_PARAMETERS = new Set([
  "auto",
  "crop",
  "dpr",
  "fit",
  "fm",
  "format",
  "h",
  "height",
  "q",
  "quality",
  "resize",
  "size",
  "w",
  "width",
]);

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter(
      (token) =>
        token.length > 1 &&
        !IDENTITY_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );
}

function containsPhrase(haystack: string, needle: string) {
  return Boolean(needle) && ` ${haystack} `.includes(` ${needle} `);
}

function tokenCoverage(haystack: string, expected: string[]) {
  if (!expected.length) return 0;
  const available = new Set(haystack.split(" "));
  return (
    expected.filter((token) => available.has(token)).length / expected.length
  );
}

function searchableContext(candidate: ProviderCandidate) {
  let sourcePath = "";
  try {
    const source = new URL(candidate.sourceUrl);
    sourcePath = decodeURIComponent(`${source.hostname} ${source.pathname}`);
  } catch {
    sourcePath = candidate.sourceUrl;
  }
  return normalize(`${candidate.sourceDetail} ${sourcePath}`);
}

function quoted(value: string) {
  const safe = value
    .replace(/["\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return safe ? `"${safe}"` : "";
}

export function cotsImageSearchQuery(identity: CotsIdentityView) {
  const context = identity.sourceCategory
    ? SEARCH_CONTEXT[identity.sourceCategory]
    : "portrait";
  return [
    quoted(identity.displayName),
    quoted(identity.sourceWork),
    quoted(identity.adaptation),
    context,
    cotsSafeImageSearchSuffix(),
  ]
    .filter(Boolean)
    .join(" ");
}

export function cotsImageRelevanceScore(
  identity: CotsIdentityView,
  candidate: ProviderCandidate,
) {
  const title = normalize(candidate.title);
  const context = searchableContext(candidate);
  const name = normalize(identity.displayName);
  const nameTokens = tokens(identity.displayName);
  const work = normalize(identity.sourceWork);
  const workTokens = tokens(identity.sourceWork);
  const titleNameCoverage = tokenCoverage(title, nameTokens);
  const contextNameCoverage = tokenCoverage(context, nameTokens);
  const titleWorkCoverage = tokenCoverage(title, workTokens);
  const contextWorkCoverage = tokenCoverage(context, workTokens);
  let score = 0;

  if (containsPhrase(title, name)) score += 100;
  else if (titleNameCoverage === 1) score += 82;
  else score += Math.round(titleNameCoverage * 28);

  if (containsPhrase(context, name)) score += 56;
  else if (contextNameCoverage === 1) score += 42;
  else score += Math.round(contextNameCoverage * 16);

  if (work) {
    if (containsPhrase(title, work)) score += 34;
    else if (titleWorkCoverage === 1) score += 26;
    else score += Math.round(titleWorkCoverage * 10);

    if (containsPhrase(context, work)) score += 22;
    else if (contextWorkCoverage === 1) score += 16;
    else score += Math.round(contextWorkCoverage * 7);
  }

  if (
    candidate.provider === "zerochan" &&
    /matched character tag/i.test(candidate.sourceDetail)
  )
    score += 48;

  if ((candidate.width ?? 0) >= 600 && (candidate.height ?? 0) >= 600)
    score += 8;
  else if ((candidate.width ?? 0) >= 300 && (candidate.height ?? 0) >= 300)
    score += 3;
  else if (
    candidate.width !== null &&
    candidate.height !== null &&
    (candidate.width < 240 || candidate.height < 240)
  )
    score -= 34;

  const visibleMetadata = `${candidate.title} ${candidate.sourceDetail}`;
  if (OBVIOUS_JUNK.test(visibleMetadata)) score -= 145;
  if (OBJECT_OR_MERCHANDISE.test(visibleMetadata)) score -= 92;
  if (GROUP_OR_ARTICLE_GRAPHIC.test(visibleMetadata)) score -= 58;
  if (
    identity.sourceCategory === "person" &&
    /impersonator|look[ -]?alike|tribute band|wax figure/i.test(visibleMetadata)
  )
    score -= 130;

  const hasIdentityEvidence =
    titleNameCoverage === 1 ||
    contextNameCoverage === 1 ||
    containsPhrase(title, name) ||
    containsPhrase(context, name);
  const hasWorkEvidence =
    Boolean(work) &&
    (titleWorkCoverage === 1 ||
      contextWorkCoverage === 1 ||
      containsPhrase(title, work) ||
      containsPhrase(context, work));

  if (!hasIdentityEvidence)
    score -= identity.sourceCategory === "person" ? 90 : 54;
  if (
    identity.sourceCategory !== "person" &&
    work &&
    !hasWorkEvidence &&
    candidate.provider !== "zerochan"
  )
    score -= 16;

  return score;
}

function canonicalImageUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = decodeURIComponent(url.pathname)
    .replace(/\/thumb\/(.+\.(?:avif|jpe?g|png|webp))\/\d+px-[^/]+$/i, "/$1")
    .replace(/([_-])\d{2,5}x\d{2,5}(?=\.(?:avif|jpe?g|png|webp)$)/i, "")
    .replace(/=w\d+(?:-h\d+)?(?:-[a-z0-9-]+)?$/i, "");
  for (const parameter of [...url.searchParams.keys()])
    if (
      TRANSFORM_QUERY_PARAMETERS.has(parameter.toLowerCase()) ||
      parameter.toLowerCase().startsWith("utm_")
    )
      url.searchParams.delete(parameter);
  url.searchParams.sort();
  return url.href;
}

export function cotsImageAssetKey(candidate: ProviderCandidate) {
  if (candidate.provider === "zerochan" && /^\d+$/.test(candidate.externalId))
    return createHash("sha256")
      .update(`zerochan:${candidate.externalId}`)
      .digest("hex");
  const value = candidate.originalUrl || candidate.previewUrl || "";
  let canonical = value;
  try {
    canonical = canonicalImageUrl(value);
  } catch {
    // Sanitization rejects malformed image URLs before this key is persisted.
  }
  return createHash("sha256").update(canonical).digest("hex");
}

export function rankCotsImageCandidates(
  identity: CotsIdentityView,
  candidates: ProviderCandidate[],
) {
  const threshold = identity.sourceCategory === "person" ? 48 : 38;
  const ranked = candidates
    .filter(
      (candidate) =>
        candidate.form === "IMAGE" &&
        !hasUnsafeCotsImageMetadata(
          candidate.title,
          candidate.sourceDetail,
          candidate.sourceUrl,
          candidate.originalUrl,
          candidate.previewUrl,
        ),
    )
    .map((candidate, index) => ({
      candidate,
      index,
      score: cotsImageRelevanceScore(identity, candidate),
      assetKey: cotsImageAssetKey(candidate),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const seen = new Set<string>();
  return ranked.flatMap(({ candidate, score, assetKey }) => {
    if (seen.has(assetKey)) return [];
    seen.add(assetKey);
    return [
      {
        ...candidate,
        imageQuality: { assetKey, relevanceScore: score },
      },
    ];
  });
}

function hammingDistance(left: string, right: string) {
  if (left.length !== right.length || !/^[0-9a-f]+$/i.test(left + right))
    return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index++) {
    let bits =
      Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (bits) {
      distance += bits & 1;
      bits >>>= 1;
    }
  }
  return distance;
}

export function areCotsImageFingerprintsNear(left: string, right: string) {
  const distance = cotsImageFingerprintDistance(left, right);
  if (!distance) return false;
  return (
    distance.difference <= 14 ||
    (distance.difference <= 24 && distance.average <= 18) ||
    (distance.difference <= 56 && distance.average <= 20)
  );
}

function cotsImageFingerprintDistance(left: string, right: string) {
  const [leftDifference, leftAverage] = left.split(".");
  const [rightDifference, rightAverage] = right.split(".");
  if (!leftDifference || !leftAverage || !rightDifference || !rightAverage)
    return null;
  return {
    difference: hammingDistance(leftDifference, rightDifference),
    average: hammingDistance(leftAverage, rightAverage),
  };
}

export function deduplicateCotsImageCandidates(
  candidates: ProviderCandidate[],
  existing: ProviderCandidate[] = [],
) {
  const assetKeys = new Set(
    existing.flatMap((candidate) =>
      candidate.imageQuality?.assetKey
        ? [candidate.imageQuality.assetKey]
        : candidate.form === "IMAGE"
          ? [cotsImageAssetKey(candidate)]
          : [],
    ),
  );
  const fingerprints = existing.flatMap((candidate) =>
    candidate.imageQuality?.perceptualHash
      ? [candidate.imageQuality.perceptualHash]
      : [],
  );

  return candidates.filter((candidate) => {
    const assetKey =
      candidate.imageQuality?.assetKey ?? cotsImageAssetKey(candidate);
    const fingerprint = candidate.imageQuality?.perceptualHash;
    if (assetKeys.has(assetKey)) return false;
    if (
      fingerprint &&
      fingerprints.some((seen) =>
        areCotsImageFingerprintsNear(fingerprint, seen),
      )
    )
      return false;
    assetKeys.add(assetKey);
    if (fingerprint) fingerprints.push(fingerprint);
    return true;
  });
}
