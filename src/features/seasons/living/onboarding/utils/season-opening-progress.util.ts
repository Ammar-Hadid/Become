import type { OnboardingStage } from "../onboarding.schema";
type GuidedStage = OnboardingStage | "ENTRY";

export type OpeningStepState = "complete" | "current" | "upcoming";
export type OpeningStep = {
  id: string;
  label: string;
  state: OpeningStepState;
};
export const preparationSteps = [
  {
    id: "character",
    label: "Character",
    title: "Who will inspire this Season?",
    description:
      "Find your character. You can change the character or version while shaping the Season.",
  },
  {
    id: "world",
    label: "World & mood",
    title: "Shape the world of your Season.",
    description:
      "Give the world a place and a feeling. AI will prepare the character details and visual direction.",
  },
  {
    id: "summary",
    label: "Summary",
    title: "Here’s the Season we’ll create.",
    description:
      "Read the character, voice and world together. Artwork begins only after you approve this draft.",
  },
] as const;

/** Presentation follows the actual checkpoint, never a timer or text reveal. */
export function resolveOpeningProgress(stage: GuidedStage) {
  const preparationIndex =
    stage === "ENTRY"
      ? 0
      : stage === "WORLD"
        ? 1
        : ["ASSEMBLING", "NEEDS_INPUT", "SUMMARY"].includes(stage)
          ? 2
          : null;
  const phaseIndex =
    preparationIndex !== null
      ? 0
      : stage === "READY" || stage === "ACTIVE"
        ? 2
        : 1;
  const stateAt = (index: number, current: number): OpeningStepState =>
    index < current ? "complete" : index === current ? "current" : "upcoming";
  return {
    preparationIndex,
    phases: ["Character", "Imagery", "Activate Season"].map((label, index) => ({
      id: `phase-${index}`,
      label,
      state:
        stage === "ACTIVE" ? ("complete" as const) : stateAt(index, phaseIndex),
    })),
    preparation: preparationSteps.map((step, index) => ({
      id: step.id,
      label: step.label,
      state: stateAt(index, preparationIndex ?? 3),
    })),
  };
}
