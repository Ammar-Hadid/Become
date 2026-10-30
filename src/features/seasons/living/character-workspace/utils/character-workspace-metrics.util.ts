import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

export function characterWorkspaceMetrics(profile: LivingCharacterProfile) {
  const sourceIds = new Set(profile.sources.map((source) => source.id));
  const details = [
    ...profile.speechPatterns,
    ...profile.signaturePhrases,
    ...profile.canonReferences,
  ];
  const linkedDetails = details.filter((detail) =>
    detail.sourceIds.some((id) => sourceIds.has(id)),
  ).length;
  const describedSources = profile.sources.filter(
    (source) => source.title.trim() && source.notes.trim(),
  ).length;

  return {
    sourceCount: profile.sources.length,
    describedSources,
    sourceCompleteness: profile.sources.length
      ? Math.round((describedSources / profile.sources.length) * 100)
      : 0,
    detailCount: details.length,
    linkedDetails,
    citationCoverage: details.length
      ? Math.round((linkedDetails / details.length) * 100)
      : null,
  };
}
