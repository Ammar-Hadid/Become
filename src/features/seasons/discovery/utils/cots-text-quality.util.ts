import type { CotsIdentityView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { normalizeCotsQuote } from "./cots-text-normalizer.util";

const quoteForms = new Set(["QUOTATION", "DIALOGUE_TURN"]);
const LEADING_STAGE_DIRECTION =
  /^\s*(?:\[[^\r\n]{1,240}\]|\([^\r\n)]{1,240}\))\s*/u;
const THROWAWAY_OPENING =
  /^(?:and now (?:to|for)\b|(?:oh,?\s+)?come on\b|let(?:'s| us)\s+go\b|(?:hey,?\s+)?wait(?: a minute)?\b|get (?:him|her|them)\b|look out\b|watch out\b)/i;
const SHORT_APOLOGY = /^(?:(?:i['’]?m|i am)\s+)?sorry\b/i;
const FILLER_OPENING = /^(?:well|oh|hey|yeah|yep|phew|uh|um)\b/i;
const DEPTH_LANGUAGE =
  /\b(?:believ(?:e|ed|es|ing)|choices?|code|courage|death|die|discipline|dreams?|dying|fear|freedom|friends?|future|great(?:er|est)?|hope|honou?r|justice|life|lives|love|meaning|principles?|purpose|promise|regret|respect|sacrifice|strength|truth|trust|weak(?:ness)?|worth)\b/i;
const REASONING_LANGUAGE =
  /\b(?:because|even if|if|rather than|so that|though|unless|until|when|whenever|while|yet)\b|\bbut\b/i;
const COMMITMENT_LANGUAGE =
  /\b(?:i|we)\s*(?:(?:['’]m|am)\s+)?(?:will|won['’]?t|want|decided|choose|believe|refuse|promise|gonna|going to|have to|must)\b/i;
const GENERAL_LANGUAGE =
  /\b(?:always|everyone|everything|never|no one|nobody|nothing|sometimes|whatever|whoever)\b/i;
const FUTURE_RESOLVE_LANGUAGE = /\b(?:one day|one of these days|someday)\b/i;
const SCENE_ACTION_LANGUAGE =
  /\b(?:bring|chart|come|crew|follow|give|get|go|grab|head|join|leave|look|money|put|run|steal|take|wait)\b/i;

function comparable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function likelyBiography(text: string) {
  return (
    /\([^)]*\bborn\b[^)]*\)\s+(?:is|was)\b/i.test(text) ||
    /^(?:[\p{L}. '-]+),?\s+(?:is|was)\s+(?:an?|the)\s+[^.]{20,}\b(?:actor|author|businessman|businesswoman|politician|singer|personality|athlete|player)\b/iu.test(
      text,
    )
  );
}

/**
 * A deliberately conservative, metadata-only proxy for whether fictional
 * dialogue can stand on its own outside the scene that produced it.
 */
function frameworthinessScore(text: string) {
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  if (
    words.length <= 2 ||
    LEADING_STAGE_DIRECTION.test(text) ||
    THROWAWAY_OPENING.test(text) ||
    (SHORT_APOLOGY.test(text) && words.length < 16)
  )
    return -100;

  const hasDepth = DEPTH_LANGUAGE.test(text);
  const hasReasoning = REASONING_LANGUAGE.test(text);
  const hasCommitment = COMMITMENT_LANGUAGE.test(text);
  const hasGeneral = GENERAL_LANGUAGE.test(text);
  const hasFutureResolve = FUTURE_RESOLVE_LANGUAGE.test(text);
  const sentences = text.split(/[.!?]+/).filter((part) => part.trim()).length;
  let score = 0;

  if (words.length >= 7 && words.length <= 45) score += 3;
  else if (words.length >= 4 && words.length <= 70) score += 1;
  else if (words.length > 70) score -= 2;
  if (sentences >= 2 && sentences <= 3) score += 1;
  if (hasDepth) score += 4;
  if (hasReasoning) score += 4;
  if (hasCommitment) score += 3;
  if (hasGeneral) score += 4;
  if (hasFutureResolve) score += 2;
  if (/\b([\p{L}]{5,})\b[\s\S]*\b\1\b/iu.test(text)) score += 1;
  if (
    !hasDepth &&
    !hasReasoning &&
    !hasCommitment &&
    !hasGeneral &&
    !hasFutureResolve
  )
    score -= 4;
  if (!hasDepth && SCENE_ACTION_LANGUAGE.test(text)) score -= 4;
  if (FILLER_OPENING.test(text)) score -= 2;
  if (/\?\s*[”"']?$/.test(text) && !hasDepth) score -= 3;
  if (/!\s*[”"']?$/.test(text) && words.length < 10 && !hasDepth) score -= 2;
  return score;
}

function qualityScore(
  identity: CotsIdentityView,
  candidate: ProviderCandidate,
) {
  const text = candidate.text ?? "";
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter((part) => part.trim()).length;
  const identityName = comparable(identity.displayName);
  const speaker = comparable(candidate.speaker ?? "");
  const title = comparable(candidate.title);
  const expectedWork = comparable(identity.sourceWork);
  const sourceWork = comparable(candidate.sourceWork);
  let score = candidate.form === "QUOTATION" ? 44 : 40;

  // Provider order is the strongest available popularity signal. No date or
  // revision value participates in the ranking.
  if (candidate.popularityRank)
    score += Math.max(0, 2000 - candidate.popularityRank * 100);

  if (speaker === identityName) score += 34;
  else if (speaker && candidate.evidence !== "UNRESOLVED") score -= 120;
  if (title === identityName) score += 14;
  if (expectedWork && sourceWork === expectedWork) score += 24;
  else if (expectedWork && sourceWork && sourceWork !== expectedWork)
    score -= 90;

  if (text.length >= 24 && text.length <= 260) score += 48;
  else if (text.length <= 420) score += 22;
  else if (text.length > 700) score -= 72;
  if (words >= 5 && words <= 38) score += 30;
  else if (words > 80) score -= 36;
  if (sentences === 1) score += 14;
  else if (sentences > 4) score -= 30;
  score += frameworthinessScore(text) * 12;
  if (/\b(?:https?:\/\/|www\.)/i.test(text)) score -= 300;
  if (/^(?:chapter|episode|season|source|citation)\b/i.test(text)) score -= 40;
  if (candidate.evidence === "UNRESOLVED") score -= 24;
  return score;
}

/**
 * Ranks quotable wording by provider popularity when available, then by a
 * stable salience/relevance proxy. Passages and source links retain source order.
 */
export function rankCotsTextCandidates(
  identity: CotsIdentityView,
  candidates: ProviderCandidate[],
) {
  const seen = new Set<string>();
  const quotations = candidates
    .flatMap((candidate, index) => {
      if (!quoteForms.has(candidate.form) || !candidate.text) return [];
      const normalized = normalizeCotsQuote(candidate.text);
      if (!normalized) return [];
      const { text } = normalized;
      const duplicateKey = comparable(text);
      const frameworthiness = frameworthinessScore(text);
      if (
        !text ||
        likelyBiography(text) ||
        frameworthiness === -100 ||
        (identity.sourceCategory !== "person" && frameworthiness < 5) ||
        seen.has(duplicateKey)
      )
        return [];
      seen.add(duplicateKey);
      return [
        {
          candidate: {
            ...candidate,
            text,
            sourceDetail: [candidate.sourceDetail, normalized.sourceContext]
              .filter(Boolean)
              .join(" · "),
          },
          index,
        },
      ];
    })
    .sort(
      (left, right) =>
        qualityScore(identity, right.candidate) -
          qualityScore(identity, left.candidate) || left.index - right.index,
    )
    .map(({ candidate }) => candidate);
  const supporting = candidates.filter(
    (candidate) => !quoteForms.has(candidate.form),
  );
  return [...quotations, ...supporting];
}
