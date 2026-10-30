import { isCompleteProse } from "../../utils/complete-prose.util";
import { z } from "zod";
import { livingArtworkSlots } from "../../utils/living-artwork-prompt.util";
import { sceneTemplateKey } from "../utils/image-prompt-package.util";
export const promptWritingRequestSchema = z
  .object({
    year: z.number().int().min(2020).max(2200),
    quarter: z.number().int().min(1).max(4),
    group: z.enum(["BANNERS", "PORTRAIT", "CHAPTER"]),
    chapter: z.number().int().min(1).max(7).optional(),
    operationKey: z.uuid(),
    regenerate: z.boolean().default(false),
  })
  .strict()
  .refine(
    (value) => value.group !== "CHAPTER" || value.chapter !== undefined,
    "Choose a chapter.",
  );
export const chapterOutlineSchema = z
  .object({
    chapters: z
      .array(
        z
          .object({
            chapter: z.number().int().min(1).max(7),
            direction: z.string().trim().min(30).max(1000),
          })
          .strict(),
      )
      .length(7),
  })
  .strict();
export const writtenPromptBatchSchema = z
  .object({
    directions: z
      .array(
        z
          .object({
            key: z.string().min(1),
            description: z.string().trim().min(80).max(6000),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();
export type WrittenPromptBatch = z.infer<typeof writtenPromptBatchSchema>;
export function promptGroupTargets(group: string, chapter?: number) {
  if (group === "BANNERS") return ["banner-desktop", "banner-phone"];
  if (group === "PORTRAIT") return ["portrait"];
  if (group === "OUTLINE") return [];
  if (!chapter || chapter < 1 || chapter > 7)
    throw new Error("Choose a chapter from 1 to 7.");
  return livingArtworkSlots
    .filter((slot) => slot.chapter === chapter)
    .map(sceneTemplateKey);
}
function distinctDirections(descriptions: string[]) {
  return (
    new Set(
      descriptions.map((text) =>
        text.toLowerCase().replace(/\s+/g, " ").trim(),
      ),
    ).size === descriptions.length
  );
}
export function validateChapterOutline(
  value: z.infer<typeof chapterOutlineSchema>,
) {
  if (value.chapters.some((item) => !isCompleteProse(item.direction)))
    throw new Error(
      "A chapter direction ends mid-sentence. Retry with concise complete prose before artwork.",
    );
  if (value.chapters.some((item, index) => item.chapter !== index + 1))
    throw new Error("The progression outline omitted or reordered a chapter.");
  if (!distinctDirections(value.chapters.map((item) => item.direction)))
    throw new Error(
      "The progression outline repeated a chapter instead of developing the world. Retry prompt writing.",
    );
  return value;
}
export function validateWrittenTargets(
  value: WrittenPromptBatch,
  targets: string[],
) {
  if (value.directions.some((item) => !isCompleteProse(item.description)))
    throw new Error(
      "An image direction ends mid-sentence. Retry before creating artwork.",
    );
  if (
    value.directions.length !== targets.length ||
    new Set(value.directions.map((item) => item.key)).size !== targets.length ||
    value.directions.some((item) => !targets.includes(item.key))
  )
    throw new Error(
      "Prompt writing changed or omitted an image composition. Retry before creating artwork.",
    );
  if (!distinctDirections(value.directions.map((item) => item.description)))
    throw new Error(
      "Prompt writing repeated the same composition for different targets. Retry before creating artwork.",
    );
  return value;
}
