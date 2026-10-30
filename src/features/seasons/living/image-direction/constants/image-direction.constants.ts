const INITIAL_IMAGE_TEMPLATE_DEFINITIONS = [
  {
    key: "visual-language",
    label: "Become visual language",
    text: "Create finished artwork with expressive composition, believable depth, detailed scenery across the whole frame, and character-appropriate cinematic lighting. Cinematic does not imply combat, darkness, anger, or a specific color palette. Preserve the approved character identity and Season art direction. No baked-in words, typography, speech bubbles, logos, watermarks, UI, or generic archetype substitutions.",
  },
  {
    key: "reference-sheet",
    label: "Character reference sheet",
    text: "Create a wide visual reference sheet for {{character}} from {{sourceWork}} ({{adaptation}}). Show one consistent identity, outfit, proportions, and a range of expressions true to the approved intent. Include environmental motifs from {{setting}}. The sheet will anchor later artwork; continuity matters more than spectacle.",
  },
  {
    key: "banner-desktop",
    label: "Character banner · desktop",
    text: "Create a very wide 21:9 character identity banner. Place {{character}} center-right with their face and upper body clear. Continue rich environmental detail to the left edge, protecting a readable copy area on the left and a small quiet area at far right. Make the world feel striking in the manner of this character, without a blank black region or a baked-in gradient. The attached canonical-character images define identity; any attached reference sheet reinforces it.",
  },
  {
    key: "banner-phone",
    label: "Character banner · phone",
    text: "Create a separate vertical 9:16 character identity banner, never a crop of the desktop image. Keep {{character}}'s recognizable face in the upper half and a low-detail copy region beneath it for title, quote, and a short line. Preserve expressive setting detail and the attached approved reference identity.",
  },
  {
    key: "portrait",
    label: "Distinct profile portrait",
    text: "Create one original square 1:1 portrait of {{character}} that remains recognizable in a small circular crop. This is a new composition, never a banner crop. Center face, eyes, hair, and expression within a safe circle with room for user reframing. Use a rich but subordinate background and match the approved emotional intent. The attached canonical-character images define the original character, and any attached reference-sheet reinforces identity; a second attached banner, when present, provides Season continuity only.",
  },
  ...(["ON_TRACK", "NEUTRAL", "FAR_BEHIND"] as const).flatMap((state) =>
    (["DESKTOP", "MOBILE"] as const).map((format) => ({
      key: `scene-${state.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`,
      label: `Scene · ${state.toLowerCase().replaceAll("_", " ")} · ${format.toLowerCase()}`,
      text: `Create one finished Living Season scene for chapter {{chapter}} of 7. The character and scenery share the same lighting and perspective. {{sceneState}} Make the chapter perceptibly more developed than its predecessor while preserving identity and setting continuity. ${format === "MOBILE" ? "Compose a separate 9:16 portrait for a 320 px phone: clear face and upper body in the central/upper area, with a quiet copy area. Never crop a wide image." : "Compose a 16:9 desktop scene with a legible face, distinct quiet interface-copy area, and environmental change visible at a glance."} The attached canonical-character images define the original character, and any attached reference-sheet reinforces identity; any second image guides continuity only and must be recomposed for this state and format.`,
    })),
  ),
] as const;

/** Each chapter has its own six editable recipes; legacy recipes remain readable. */
export const IMAGE_TEMPLATE_DEFINITIONS = [
  ...INITIAL_IMAGE_TEMPLATE_DEFINITIONS,
  ...Array.from({ length: 7 }, (_, index) => index + 1).flatMap((chapter) =>
    (["ON_TRACK", "NEUTRAL", "FAR_BEHIND"] as const).flatMap((state) =>
      (["DESKTOP", "MOBILE"] as const).map((format) => {
        const legacyKey = `scene-${state.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`;
        const legacy = INITIAL_IMAGE_TEMPLATE_DEFINITIONS.find(
          (item) => item.key === legacyKey,
        )!;
        return {
          key: `scene-chapter-${chapter}-${state.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`,
          label: `Chapter ${chapter} · ${state === "NEUTRAL" ? "in progress" : state === "FAR_BEHIND" ? "behind pace" : "on track"} · ${format.toLowerCase()}`,
          text: legacy.text,
        };
      }),
    ),
  ),
] as const;
export const IMAGE_RECIPE_DEFINITIONS = IMAGE_TEMPLATE_DEFINITIONS.filter(
  (item) =>
    !item.key.startsWith("scene-") || item.key.startsWith("scene-chapter-"),
);

export type ImageTemplateKey =
  (typeof IMAGE_TEMPLATE_DEFINITIONS)[number]["key"];

export const IMAGE_SCENE_DIRECTION = {
  ON_TRACK:
    "Show visible, believable improvement. The character responds to progress in their own approved manner.",
  NEUTRAL:
    "Show work in progress and uncertainty without invented disaster. The character notices what remains in their own approved manner.",
  FAR_BEHIND:
    "Show a specific consequence of stalled progress. Concern or disappointment must fit this character, never an automatic angry or frightening pose.",
} as const;
