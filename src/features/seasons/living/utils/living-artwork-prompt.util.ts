import type { LivingArtworkSlot, LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

// Legacy preview fixtures only. Production image requests resolve versioned packages
// through image-direction/services/image-prompt-package.service.ts.

const stateDirection = {
  ON_TRACK: "The environment shows visible, believable improvement. The character is engaged and quietly pleased; confidence fits their personality, never a generic battle pose.",
  NEUTRAL: "The environment shows work in progress and uncertainty without disaster. The character notices what remains and responds in their own characteristic manner.",
  FAR_BEHIND: "The environment shows a specific consequence of stalled progress. The character's expression and pose reflect concern or disappointment in a way true to this character, never an automatic angry or frightening treatment.",
} as const;

export function livingReferencePrompt(
  profile: Pick<LivingCharacterProfile, "characterName" | "sourceWork" | "adaptation" | "visualDirection" | "visualBoundaries">,
  setting: string,
  visualBrief: string,
) {
  return [
    `Create a coherent visual reference sheet for ${profile.characterName} from ${profile.sourceWork}${profile.adaptation ? ` (${profile.adaptation})` : ""}.`,
    `Character identity and expressions: ${profile.visualDirection}. Character boundaries: ${profile.visualBoundaries}. Setting: ${setting}. World art direction: ${visualBrief}.`,
    "Show one clear character identity, consistent outfit and proportions, and a range of expressions appropriate to success, uncertainty, and setback. Include environmental motifs from the setting. Keep the character's face unambiguous and recognizable. This is a reference sheet for a later sequence of finished scenes, so continuity matters more than dramatic effects.",
    "No typography, labels, speech bubbles, logos, or watermark. Wide composition.",
  ].join("\n\n");
}

export function livingArtworkPrompt(
  profile: Pick<LivingCharacterProfile, "characterName" | "sourceWork" | "adaptation" | "visualDirection" | "visualBoundaries">,
  setting: string,
  visualBrief: string,
  slot: LivingArtworkSlot,
) {
  return [
    `Create one finished, cohesive illustration for Become's Living Season. Depict ${profile.characterName} from ${profile.sourceWork}${profile.adaptation ? `, ${profile.adaptation} interpretation` : ""}. The character and scenery must belong to the same image, lighting, and perspective.`,
    `Setting: ${setting}. Visual direction: ${visualBrief}. Character reference: ${profile.visualDirection}. Boundaries: ${profile.visualBoundaries}.`,
    `Chapter ${slot.chapter} of 7. This scene is ${slot.state.toLowerCase().replaceAll("_", " ")}. ${stateDirection[slot.state]} Make this chapter perceptibly more developed than the previous one while preserving character and setting continuity.`,
    slot.format === "MOBILE"
      ? "Portrait phone composition. Keep the character's complete face, expression, and recognizable upper body clearly visible in the central/upper area at a 320 px viewport. Reserve a distinct quiet area for interface copy. Do not rely on cropping a wide image; recompose the scene for a narrow, short phone screen."
      : "Wide desktop composition. Keep the character and expression legible while leaving a distinct quiet area for interface copy. The key environmental change must read at a glance.",
    "No words, typography, logos, speech bubbles, UI, watermarks, or extra versions of the character. Preserve the approved reference identity and mood. High-quality finished artwork, with specific environmental storytelling rather than generic effects.",
  ].join("\n\n");
}

export const livingArtworkSlots = Array.from({ length: 7 }, (_, index) => index + 1)
  .flatMap((chapter) => (["ON_TRACK", "NEUTRAL", "FAR_BEHIND"] as const)
    .flatMap((state) => (["DESKTOP", "MOBILE"] as const).map((format) => ({ chapter, state, format }))));
