/** Only expose complete paragraphs from the first, explicitly ordered summary field.
 * A partial JSON document is preview data, never a validated Season draft. */
export function streamingSummaryParagraphs(snapshot: string): string[] {
  const prefix = /^\s*\{\s*"draft"\s*:\s*\{\s*"summary"\s*:\s*"/.exec(snapshot);
  if (!prefix) return [];
  let encoded = "";
  let closed = false;
  for (let i = prefix[0].length; i < snapshot.length; i++) {
    const char = snapshot[i];
    if (char === '"') {
      closed = true;
      break;
    }
    if (char === "\\") {
      const escape = snapshot[i + 1];
      if (!escape) break;
      const length = escape === "u" ? 6 : 2;
      if (i + length > snapshot.length) break;
      encoded += snapshot.slice(i, i + length);
      i += length - 1;
    } else encoded += char;
  }
  try {
    const text: string = JSON.parse(`"${encoded}"`);
    const paragraphs = text.split(/\n\s*\n/);
    if (!closed) paragraphs.pop();
    return paragraphs.map((p) => p.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** A range from this account's successful calls, never a fabricated countdown. */
export function preparationEstimate(
  researchMs: number[],
  assemblyMs: number[],
  needsResearch: boolean,
) {
  const valid = (values: number[]) =>
    values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const research = valid(researchMs),
    assembly = valid(assemblyMs);
  const samples = needsResearch
    ? Math.min(research.length, assembly.length)
    : assembly.length;
  if (samples < 3) return null;
  const range = (values: number[]) => [
    values[0],
    values[Math.ceil(values.length * 0.9) - 1],
  ];
  const a = range(assembly),
    r = needsResearch ? range(research) : [0, 0];
  return { minMs: a[0] + r[0], maxMs: a[1] + r[1], samples };
}
