/** Identity, summary, banners, portrait, seven chapters, activation. */
export const ONBOARDING_MILESTONES = 12;
export function onboardingProgress(stage: string, chapter: number) {
  if (stage === "ACTIVE") return ONBOARDING_MILESTONES;
  if (stage === "READY") return 11;
  if (["SCENES", "GENERATING_SCENES", "SCENE_PREPARATION"].includes(stage))
    return 3 + Math.min(7, Math.max(1, chapter));
  if (
    [
      "PORTRAIT",
      "GENERATING_PORTRAIT",
      "PORTRAIT_PREPARATION",
      "SCENE_METHOD",
    ].includes(stage)
  )
    return 3;
  if (["BANNER", "GENERATING_BANNER", "BANNER_PREPARATION"].includes(stage))
    return 2;
  if (["WORLD", "ASSEMBLING", "NEEDS_INPUT", "SUMMARY"].includes(stage))
    return 1;
  return 0;
}
