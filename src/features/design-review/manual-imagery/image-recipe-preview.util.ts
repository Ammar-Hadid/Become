import { z } from "zod";
import { IMAGE_TEMPLATE_DEFINITIONS } from "@/features/seasons/living/image-direction/constants/image-direction.constants";
import { imageTemplateAuthoringSchema } from "@/features/seasons/living/image-direction/schemas/image-template-authoring.schema";
import type { ImageDirectionTemplateView } from "@/features/settings/image-direction/components/image-direction-template-editor.component";
import {
  PACE_OPTIONS,
  type Format,
  type Pace,
} from "./manual-imagery-preview.util";

export type RecipeGroup =
  "style" | "banners" | "portrait" | "chapters" | "reference";
export function recipeKey(
  group: RecipeGroup,
  format: Format,
  chapter: number,
  pace: Pace,
) {
  if (group === "style") return "visual-language";
  if (group === "portrait") return "portrait";
  if (group === "reference") return "reference-sheet";
  if (group === "banners")
    return format === "MOBILE" ? "banner-phone" : "banner-desktop";
  return `scene-chapter-${chapter}-${pace.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`;
}
export function defaultRecipeLibrary(): Record<
  string,
  ImageDirectionTemplateView
> {
  const base: Record<string, ImageDirectionTemplateView> = Object.fromEntries(
    IMAGE_TEMPLATE_DEFINITIONS.filter(
      ({ key }) => !key.startsWith("scene-"),
    ).map(({ key, label, text }) => [
      key,
      {
        key,
        label,
        draft: null,
        published: {
          version: 1,
          text,
          authoring: {
            intent:
              "Write a clear, character-specific image prompt from this recipe and the approved Season context.",
            variables: [
              ...new Set(
                [...text.matchAll(/\{\{([^{}]+)\}\}/g)].map(
                  (match) => match[1],
                ),
              ),
            ],
            rules: [],
          },
        },
      },
    ]),
  );
  for (let chapter = 1; chapter <= 7; chapter++)
    for (const { key: pace, label } of PACE_OPTIONS)
      for (const format of ["DESKTOP", "MOBILE"] as const) {
        const key = recipeKey("chapters", format, chapter, pace);
        const legacyKey = `scene-${pace.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`;
        const legacy = IMAGE_TEMPLATE_DEFINITIONS.find(
          (item) => item.key === legacyKey,
        )!;
        base[key] = {
          key,
          label: `Chapter ${chapter} · ${label} · ${format === "DESKTOP" ? "desktop" : "mobile"}`,
          draft: null,
          published: {
            version: 1,
            text: legacy.text.replace("{{chapter}}", String(chapter)),
            authoring: {
              intent: `Develop Chapter ${chapter} as part of one coherent seven-chapter progression. Express ${label.toLowerCase()} through the character's approved manner, without claiming actual owner progress.`,
              variables: ["sceneState"],
              rules: [
                "Preserve approved character identity, clothing and setting landmarks.",
                "Compose mobile artwork separately; never crop a desktop scene.",
              ],
            },
          },
        };
      }
  return base;
}
const version = z.object({
  version: z.number().int().positive(),
  text: z.string().max(12000),
  authoring: imageTemplateAuthoringSchema.nullable(),
});
export const recipePreviewSchema = z.object({
  templates: z.record(
    z.string(),
    z.object({
      key: z.string(),
      label: z.string(),
      published: version.nullable(),
      draft: version.nullable(),
    }),
  ),
  history: z.record(z.string(), z.array(version).max(100)),
});
export type RecipePreview = z.infer<typeof recipePreviewSchema>;
