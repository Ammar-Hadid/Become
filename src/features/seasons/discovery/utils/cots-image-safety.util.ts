const UNSAFE_IMAGE_TERMS = [
  "18 plus",
  "adult content",
  "adult only",
  "bikini",
  "bottomless",
  "breasts",
  "cleavage",
  "echi",
  "ecchi",
  "eroge",
  "erotic",
  "explicit",
  "hentai",
  "huge breasts",
  "large breasts",
  "lewd",
  "lingerie",
  "naked",
  "nude",
  "nudity",
  "nsfw",
  "porn",
  "pornographic",
  "pornography",
  "r 18",
  "rule 34",
  "sexual content",
  "suggestive",
  "swimsuit",
  "thong",
  "topless",
  "underwear",
] as const;

const NEGATIVE_SEARCH_TERMS = [
  "nsfw",
  "ecchi",
  "echi",
  "hentai",
  "nude",
  "explicit",
];

function normalizedMetadata(values: Array<string | null | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .replace(/\b18\s*\+/g, " r 18 ")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rejects explicit adult/suggestive provider tags and equivalent visible metadata. */
export function hasUnsafeCotsImageMetadata(
  ...values: Array<string | null | undefined>
) {
  const individualValues = values.map((value) => normalizedMetadata([value]));
  if (individualValues.some((value) => value === "adult" || value === "ero"))
    return true;
  const metadata = ` ${normalizedMetadata(values)} `;
  return UNSAFE_IMAGE_TERMS.some((term) => metadata.includes(` ${term} `));
}

/** Defense-in-depth for providers that understand negative search terms. */
export function cotsSafeImageSearchSuffix() {
  return NEGATIVE_SEARCH_TERMS.map((term) => `-${term}`).join(" ");
}
