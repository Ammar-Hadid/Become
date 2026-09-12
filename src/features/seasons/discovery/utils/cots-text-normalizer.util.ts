/** Removes transport/source noise without rewriting the quoted wording itself. */
export function normalizeCotsText(value: string) {
  return value
    .replace(/\[([^\]]+)]\((?:https?:\/\/|www\.)[^)]+\)/gi, "$1")
    .replace(/\(\s*(?:https?:\/\/|www\.)[^\s)]+\s*\)/gi, "")
    .replace(/\[\s*(?:https?:\/\/|www\.)[^\]]+]/gi, "")
    .replace(/(?:https?:\/\/|www\.)[^\s<>{}\[\]()]+/gi, "")
    .replace(/\(\s*\)|\[\s*]/g, "")
    .replace(/\b(?:source|via)\s*:?\s*$/i, "")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const INLINE_SOURCE_CONTEXT =
  /\s*\(((?:same\s+)?(?:you\s*tube|youtube)\s+video|(?:statement|interview|tweet|post|speech|video|podcast|article)\s+(?:to|in|on|from|at|for|with|by)\b[^)]*)\)\s*$/i;

const SOCIAL_HANDLE = /(^|\s)@[\p{L}\p{N}_]{2,30}\b/u;
const EMAIL_ADDRESS = /\b[\p{L}\p{N}.%_+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}\b/iu;

function looksLikeRawSocialPost(value: string) {
  return SOCIAL_HANDLE.test(value) || EMAIL_ADDRESS.test(value);
}

function removeWrappingQuotationMarks(value: string) {
  if (
    (value.startsWith("“") && value.endsWith("”")) ||
    (value.startsWith('"') && value.endsWith('"'))
  )
    return value.slice(1, -1).trim();
  return value;
}

/** Separates inline provenance and rejects source-label fragments posing as quotes. */
export function normalizeCotsQuote(value: string) {
  const normalized = normalizeCotsText(value);
  if (looksLikeRawSocialPost(normalized)) return null;
  const source = normalized.match(INLINE_SOURCE_CONTEXT);
  if (!source) {
    const text = removeWrappingQuotationMarks(normalized);
    return text ? { text, sourceContext: "" } : null;
  }
  const text = removeWrappingQuotationMarks(
    normalized.slice(0, source.index).trim(),
  );
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasSentenceEnding = /[.!?…]["'”’]?$/u.test(text);
  const startsLowercase = /^\p{Ll}/u.test(text);
  if (!text || (!hasSentenceEnding && (wordCount < 6 || startsLowercase)))
    return null;
  return { text, sourceContext: source[1] };
}
