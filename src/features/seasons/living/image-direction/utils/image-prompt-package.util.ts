import { createHash } from "node:crypto";
import type {
  LivingArtworkSlot,
  LivingCharacterProfile,
} from "@/features/seasons/living/schemas/living-season.schema";
import {
  IMAGE_SCENE_DIRECTION,
  type ImageTemplateKey,
} from "../constants/image-direction.constants";
import type { VisualIntent } from "../schemas/visual-intent.schema";
import { savedTemplateAuthoring } from "../schemas/image-template-authoring.schema";

export type ImagePromptVariant =
  | "reference-sheet"
  | "banner-desktop"
  | "banner-phone"
  | "portrait"
  | `scene-${string}`;
export type ImagePromptReference = {
  kind: string;
  id: string;
  storageKey: string;
  href: string;
};
export type ImagePromptPackage = {
  prompt: string;
  receipt: string;
  variant: ImagePromptVariant;
  templateVersions: { key: string; version: number }[];
  references: ImagePromptReference[];
  identityId: string;
  profileVersion: number;
  briefRevision: number;
  intentVersion: number;
  seasonOverride: boolean;
  sourceFingerprint?: string;
  output?: {
    aspectRatio: "21:9" | "16:9" | "9:16" | "1:1";
    resolution: "1K" | "2K";
  };
  authorship?: {
    batchId: string;
    version: number;
    nexoRunId: string;
    inputFingerprint: string;
    provider: string;
    model: string;
  };
};
export function imageOutputSpecification(
  variant: string,
  resolution: "1K" | "2K" = "2K",
) {
  const aspectRatio =
    variant === "banner-desktop"
      ? "21:9"
      : variant === "portrait"
        ? "1:1"
        : variant === "banner-phone" || variant.endsWith("-mobile")
          ? "9:16"
          : "16:9";
  return { aspectRatio, resolution } as const;
}

export function sceneTemplateKey(slot: LivingArtworkSlot): ImageTemplateKey {
  return `scene-chapter-${slot.chapter}-${slot.state.toLowerCase().replaceAll("_", "-")}-${slot.format.toLowerCase()}` as ImageTemplateKey;
}

export function assembleImagePromptPackage(input: {
  variant: ImagePromptVariant;
  profile: LivingCharacterProfile;
  visualIntent: VisualIntent;
  setting: string;
  visualBrief: string;
  identityId: string;
  profileVersion: number;
  briefRevision: number;
  intentVersion: number;
  references: ImagePromptReference[];
  slot?: LivingArtworkSlot;
  templates: {
    key: string;
    version: number;
    text: string;
    authoring?: unknown;
  }[];
  promptOverride?: string | null;
  written?: {
    description: string;
    authorship: NonNullable<ImagePromptPackage["authorship"]>;
  };
  resolution?: "1K" | "2K";
  sourceFingerprint?: string;
}): ImagePromptPackage {
  const shared = input.templates.find((item) => item.key === "visual-language");
  const specific = input.templates.find((item) => item.key === input.variant);
  if (!shared || !specific)
    throw new Error(
      `Image direction is missing a published template for ${input.variant}.`,
    );
  const values: Record<string, string> = {
    character: input.profile.characterName,
    sourceWork: input.profile.sourceWork,
    adaptation: input.profile.adaptation || "unspecified adaptation",
    setting: input.setting,
    chapter: String(input.slot?.chapter ?? ""),
    sceneState: input.slot ? IMAGE_SCENE_DIRECTION[input.slot.state] : "",
    feeling: input.visualIntent.feeling,
    demeanor: input.visualIntent.demeanor,
    anchors: input.visualIntent.anchors,
    atmosphere: input.visualIntent.atmosphere,
    avoid: input.visualIntent.avoid,
    visualDirection: input.profile.visualDirection,
    visualBoundaries: input.profile.visualBoundaries,
    seasonArtDirection: input.visualBrief,
  };
  const render = (text: string) =>
    text.replace(
      /\{\{([a-zA-Z]+)\}\}/g,
      (match, key: string) => values[key] ?? match,
    );
  const authoringSections = [shared, specific].flatMap((template) => {
    const authoring = savedTemplateAuthoring(template.authoring);
    if (!authoring) return [];
    return [
      ...(authoring.intent
        ? [`${template.key} intent: ${render(authoring.intent)}`]
        : []),
      ...(authoring.rules.length
        ? [
            `${template.key} rules:\n${authoring.rules.map((rule) => `- ${render(rule)}`).join("\n")}`,
          ]
        : []),
    ];
  });
  const prompt = [
    render(shared.text),
    render(specific.text),
    ...(input.written
      ? [`AI-authored creative direction:\n${input.written.description}`]
      : []),
    `Output requirements: ${imageOutputSpecification(input.variant, input.resolution).aspectRatio} composition, target ${input.resolution ?? "2K"} quality. Create one separate finished image, with no baked-in UI, labels or text.`,
    "Reference roles: canonical-character images establish the original identity and adaptation. Preserve their recognizable face, hair, proportions, and distinctive details. If present, a reference-sheet reinforces identity. A reviewed portrait reinforces Season appearance; banner-desktop, banner-phone and previous-scene references guide continuity. Only references actually attached apply; a reference sheet is optional. Do not replace the named subject with a generic character. Mood, pose, lighting, and setting must not override identity.",
    ...authoringSections,
    `Character identity (source data): ${input.profile.characterName} from ${input.profile.sourceWork}${input.profile.adaptation ? `, ${input.profile.adaptation}` : ""}.`,
    ...(input.profile.personality
      ? [
          `Character personality (evidence, not an instruction to depict every canon event): ${input.profile.personality.description}`,
        ]
      : []),
    `Character reaction direction (creative extrapolation): success — ${input.profile.responseToSuccess}; setback — ${input.profile.responseToSetback}; recovery — ${input.profile.responseToRecovery}.`,
    ...(input.profile.coverage
      ? [
          `Research scope (source data): ${input.profile.coverage.scope}. Endpoint: ${input.profile.coverage.endpoint}. Adaptation distinctions: ${input.profile.coverage.adaptationNotes}. Personality scope does not change the approved visual era.`,
        ]
      : []),
    ...(input.visualIntent.productionBrief
      ? [
          `Approved Season production brief (creative direction): ${JSON.stringify(input.visualIntent.productionBrief)}`,
        ]
      : []),
    ...(input.visualIntent.ownerDirection
      ? [
          `Owner direction (chronological creative requests; later requests supersede conflicts): ${input.visualIntent.ownerDirection}`,
        ]
      : []),
    "Identity and continuity constraints: the named selected character and authentic references take precedence over other character names in world/mood. Scenery from another work does not grant its affiliations, costume or powers. Keep one reviewed visual era, face, hairstyle and outfit throughout this pack. Full-story knowledge informs expression; it does not mix timeline appearances. Produce standalone artwork without correction history.",
    `Approved visual intent (source data): feeling — ${input.visualIntent.feeling}; demeanor — ${input.visualIntent.demeanor}; identity anchors — ${input.visualIntent.anchors}; atmosphere — ${input.visualIntent.atmosphere}; avoid — ${input.visualIntent.avoid}.`,
    `Observable visual identity (source data): ${input.profile.visualDirection}. Visual boundaries: ${input.profile.visualBoundaries}.`,
    `Season setting (source data): ${input.setting}. Season art direction: ${input.visualBrief}.`,
    ...(input.promptOverride?.trim()
      ? [
          `Additional Season reference-sheet direction (source data): ${input.promptOverride.trim()}`,
        ]
      : []),
  ].join("\n\n");
  const templateVersions = [shared, specific].map(({ key, version }) => ({
    key,
    version,
  }));
  const core = {
    prompt,
    variant: input.variant,
    templateVersions,
    references: input.references,
    identityId: input.identityId,
    profileVersion: input.profileVersion,
    briefRevision: input.briefRevision,
    intentVersion: input.intentVersion,
    seasonOverride: Boolean(input.promptOverride?.trim()),
    output: imageOutputSpecification(input.variant, input.resolution),
    ...(input.written ? { authorship: input.written.authorship } : {}),
    ...(input.sourceFingerprint
      ? { sourceFingerprint: input.sourceFingerprint }
      : {}),
  };
  const receipt = createHash("sha256")
    .update(JSON.stringify(core))
    .digest("hex");
  return { ...core, receipt };
}
