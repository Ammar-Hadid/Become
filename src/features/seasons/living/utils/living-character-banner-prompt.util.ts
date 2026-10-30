import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

// Historical design-review prompt display only; never use for production images.

type BannerProfile = Pick<
  LivingCharacterProfile,
  | "characterName"
  | "sourceWork"
  | "adaptation"
  | "visualDirection"
  | "visualBoundaries"
>;

/** Approved banner prompt; copy-safe areas and character identity vary by composition. */
export function characterBannerPrompt(
  profile: BannerProfile,
  setting: string,
  seasonArtDirection: string,
  format: "desktop" | "phone",
) {
  const composition =
    format === "desktop"
      ? "Very wide 21:9 cinematic composition. Keep the face and torso in the center-right, with a visually rich setting continuing all the way to the left edge. Preserve readable copy areas at left and a small quiet region at far right."
      : "Separate vertical 9:16 composition, not a crop of the desktop image. Keep the recognizable face in the upper half. Leave a low-detail region beneath the face for title, quote and a short line without covering the expression.";

  return [
    `Create a premium character identity banner for ${profile.characterName} from ${profile.sourceWork}${profile.adaptation ? ` (${profile.adaptation})` : ""}.`,
    `Character identity and expression: ${profile.visualDirection}. Boundaries: ${profile.visualBoundaries}.`,
    `Setting: ${setting}. Season art direction: ${seasonArtDirection}.`,
    "Make this character's ordinary world feel cinematic through expressive composition, rich depth, environmental detail across the entire frame, and character-appropriate lighting. A gentle romance character should feel striking through warmth and emotion, not combat or anger.",
    composition,
    "Protect the copy areas without leaving blank or black space. Do not include text, lettering, logos, speech bubbles, watermarks, UI, or a baked-in gradient. Keep the character recognizable and the artwork visually coherent at card scale.",
  ].join("\n\n");
}
