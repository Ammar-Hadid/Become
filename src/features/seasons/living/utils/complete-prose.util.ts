/** Sentence punctuation may precede one or more source markers. This is a
 * truncation heuristic, not a factual or citation-validation check. */
export function isCompleteProse(value: string) {
  const prose = value
    .trim()
    .replace(/(?:\s*\[[a-zA-Z0-9_-]+\])+$/, "")
    .trimEnd();
  return /[.!?…]["'”’)]*$/.test(prose);
}
