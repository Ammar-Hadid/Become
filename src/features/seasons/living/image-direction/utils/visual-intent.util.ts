import { createHash } from "node:crypto";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

export function visualBriefFingerprint(identityId: string, profileVersion: number, setting: string, visualBrief: string) {
  return createHash("sha256").update(JSON.stringify({ identityId, profileVersion, setting, visualBrief })).digest("hex");
}

export function visualIntentMissing(profile: LivingCharacterProfile) {
  const missing: string[] = [];
  if (!profile.sources.some((source) => source.title.trim() && source.notes.trim().length >= 30))
    missing.push("Add a reviewed source with notes describing the character.");
  if (profile.visualDirection.trim().length < 30)
    missing.push("Describe recognizable appearance and expression in visual direction.");
  if (profile.visualBoundaries.trim().length < 20)
    missing.push("Describe what the imagery must avoid in visual boundaries.");
  return missing;
}
