import {
  normalizeCotsQuote,
  normalizeCotsText,
} from "./cots-text-normalizer.util";

export function plainWikiText(value: string) {
  return normalizeCotsText(
    value
      .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, "")
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, "$2")
      .replace(/'{2,5}/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'"),
  );
}

function comparableSpeakerName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function speakerIdentityMatch(speaker: string, identity: string) {
  const speakerName = comparableSpeakerName(speaker);
  const identityName = comparableSpeakerName(identity);
  const speakerTokens = speakerName.split(" ").filter(Boolean);
  const identityTokens = identityName.split(" ").filter(Boolean);
  const exact = Boolean(speakerName) && speakerName === identityName;
  const alias =
    !exact &&
    speakerTokens.length === 1 &&
    speakerTokens[0].length > 2 &&
    identityTokens.length > 1 &&
    (speakerTokens[0] === identityTokens[0] ||
      speakerTokens[0] === identityTokens.at(-1));
  return { exact, alias };
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
    const topLevelQuote = /^\*[^*]/.test(raw);
    const colonPrefixedTurn = /^:+\s*(?:'{2,5})?[^:\n]{1,100}:\s*/.test(raw);
    const bulletSpeakerTurn =
      /^\*[^*]\s*'{2,5}[^'\n]{1,100}(?:'{2,5}\s*:|:'{2,5})\s*/i.test(raw);
    const boldSpeakerTurn =
      /^'{2,5}[^'\n]{1,100}(?:'{2,5}\s*(?:\([^\n)]{1,60}\)\s*)?:|(?::|,\s*to\b[^:\n]{0,60}:)'{2,5}\s*)/i.test(
        raw,
      );
    if (!topLevelQuote && !colonPrefixedTurn && !boldSpeakerTurn) {
      if (pending && !hasCitation && raw.trim() && !/^[{[|!<]/.test(raw.trim()))
        pending.text += ` ${plainWikiText(raw)}`;
      continue;
    }
    flush();
    if (about) continue;
    const normalized = normalizeCotsQuote(
      plainWikiText(raw.replace(/^[*:]+\s*/, "")),
    );
    if (!normalized) continue;
    const text = normalized.text;
    const detail = [heading, normalized.sourceContext]
      .filter(Boolean)
      .join(" · ");
    const explicit =
      colonPrefixedTurn || bulletSpeakerTurn || boldSpeakerTurn
        ? text.match(/^([^:]{1,100}):\s*([\s\S]+)$/)
        : null;
    if (explicit) {
      const speaker = explicit[1]
        .replace(/\s*\([^)]*\)\s*$/u, "")
        .replace(/,\s*to\b.*$/i, "")
        .trim();
      const { exact, alias } = speakerIdentityMatch(speaker, name);
      if (exact || alias) {
        attributed = true;
        pending = {
          text: explicit[2].trim(),
          detail: alias
            ? `${detail} · Source names the speaker ${speaker}; confirm the identity match.`
            : detail,
          speaker,
          dialogue: true,
          unresolved: alias,
        };
      }
    } else {
      attributed =
        person ||
        [...headings.values()].some((v) => v.toLocaleLowerCase() === target);
      pending = {
        text,
        detail,
        speaker: name,
        dialogue: false,
        unresolved: false,
      };
    }
  }
  flush();
  return items.map((item) => ({ ...item, detail: item.detail.slice(0, 1500) }));
}
