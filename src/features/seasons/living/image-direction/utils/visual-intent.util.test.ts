import { expect, it } from "vitest";
import { visualBriefFingerprint, visualIntentMissing } from "./visual-intent.util";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

it("identifies missing grounding without deriving mood from a name or genre", () => {
  const profile = { sources: [{ id: "a", title: "Profile", notes: "Short" }], visualDirection: "Dark hair", visualBoundaries: "None" } as LivingCharacterProfile;
  expect(visualIntentMissing(profile)).toHaveLength(3);
  expect(visualIntentMissing({ ...profile, sources: [{ id: "a", title: "Profile", notes: "A grounded description of appearance and demeanor in official source material." }], visualDirection: "A clear, recognizable face with specific hair and costume details", visualBoundaries: "Avoid changing recognizable proportions or costume details" })).toEqual([]);
  expect(visualBriefFingerprint("id", 1, "A", "B")).not.toBe(visualBriefFingerprint("id", 1, "C", "B"));
});
