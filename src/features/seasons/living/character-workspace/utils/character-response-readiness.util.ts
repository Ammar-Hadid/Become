import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

function hasDetail(value: string, minimumWords: number) {
  return value.trim().split(/\s+/u).filter(Boolean).length >= minimumWords;
}

export function characterResponseReadiness(profile: LivingCharacterProfile) {
  const describedSources = profile.sources.filter(
    (source) => source.title.trim() && hasDetail(source.notes, 6),
  );
  const describedIds = new Set(describedSources.map((source) => source.id));
  const groundedSpeech = profile.speechPatterns.filter(
    (pattern) =>
      hasDetail(pattern.description, 6) &&
      pattern.sourceIds.some((id) => describedIds.has(id)),
  );
  const missing: string[] = [];

  if (describedSources.length < 2)
    missing.push("two sources with at least six words of notes each");
  if (groundedSpeech.length < 2)
    missing.push("two detailed speech patterns linked to those sources");
  if (
    !hasDetail(profile.responseToSuccess, 6) ||
    !hasDetail(profile.responseToSetback, 6) ||
    !hasDetail(profile.responseToRecovery, 6)
  )
    missing.push("specific reactions to success, setbacks, and recovery");
  if (!hasDetail(profile.visualDirection, 8))
    missing.push("a visual identity with recognizable features");
  if (!hasDetail(profile.visualBoundaries, 6))
    missing.push("visual boundaries for the portrait and scenery");

  return { ready: missing.length === 0, missing };
}
