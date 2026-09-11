export function plainWikiText(value: string) {
  return value
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, "$2")
    .replace(/'{2,5}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .trim();
}

/** Supported explicit speaker headings/turns only. Narrative never becomes character dialogue. */
export function extractWikiQuotes(
  wikitext: string,
  name: string,
  person = false,
) {
  const target = name.toLocaleLowerCase().trim();
  let heading = "";
  let about = false;
  type Extracted = {
    text: string;
    detail: string;
    speaker: string;
    dialogue: boolean;
    unresolved: boolean;
  };
  let pending: Extracted | null = null;
  let attributed = false;
  let hasCitation = false;
  const excludedHeadings = new Map<number, boolean>();
  const headings = new Map<number, string>();
  const items: Extracted[] = [];
  const flush = () => {
    if (
      pending &&
      attributed &&
      pending.text.length >= 8 &&
      pending.text.length <= 2000 &&
      !pending.text.includes("{{")
    )
      items.push(pending);
    pending = null;
    attributed = false;
    hasCitation = false;
  };
  for (const raw of wikitext.split("\n")) {
    const h = raw.match(/^(={1,6})\s*(.*?)\s*\1\s*$/);
    if (h) {
      flush();
      heading = plainWikiText(h[2]);
      for (const level of excludedHeadings.keys())
        if (level >= h[1].length) excludedHeadings.delete(level);
      for (const level of headings.keys())
        if (level >= h[1].length) headings.delete(level);
      headings.set(h[1].length, heading);
      excludedHeadings.set(
        h[1].length,
        /quotes? about|^about\b|attributed|disputed|misattribut|unsourced|external links|see also|cast/i.test(
          heading,
        ),
      );
      about = [...excludedHeadings.values()].some(Boolean);
      continue;
    }
    if (/^\*{2,}/.test(raw)) {
      if (pending) {
        const citation = plainWikiText(raw.replace(/^\*+\s*/, ""));
        pending.detail += ` ${citation}`;
        if (
          citation.toLocaleLowerCase().startsWith(target) &&
          !/[\p{L}\p{N}]/u.test(
            citation.slice(target.length, target.length + 1),
          )
        )
          attributed = true;
        hasCitation = true;
      }
      continue;
    }
    if (
      !/^(?:\*[^*]|:+\s*(?:'{2,5})?[^:]{1,100}:|'{2,5}[^:]{1,100}:)/.test(raw)
    ) {
      if (pending && !hasCitation && raw.trim() && !/^[{[|!<]/.test(raw.trim()))
        pending.text += ` ${plainWikiText(raw)}`;
      continue;
    }
    flush();
    if (about) continue;
    const text = plainWikiText(raw.replace(/^[*:]+\s*/, ""));
    const explicit = text.match(/^([^:]{1,100}):\s*([\s\S]+)$/);
    if (explicit) {
      const speaker = explicit[1].replace(/,\s*to\b.*$/i, "").trim();
      const exact = speaker.toLocaleLowerCase() === target;
      const short =
        speaker.length > 2 &&
        !speaker.includes(" ") &&
        target.startsWith(`${speaker.toLocaleLowerCase()} `);
      if (exact || short) {
        attributed = true;
        pending = {
          text: explicit[2].trim(),
          detail: short
            ? `${heading} · Source names the speaker ${speaker}; confirm the identity match.`
            : heading,
          speaker,
          dialogue: true,
          unresolved: !exact,
        };
      }
    } else {
      attributed =
        person ||
        [...headings.values()].some((v) => v.toLocaleLowerCase() === target);
      pending = {
        text,
        detail: heading,
        speaker: name,
        dialogue: false,
        unresolved: false,
      };
    }
  }
  flush();
  return items.map((item) => ({ ...item, detail: item.detail.slice(0, 1500) }));
}
