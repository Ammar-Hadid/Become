import { z } from "zod";

export const productionBriefSchema = z
  .object({
    theme: z.string().trim().min(20).max(1000),
    visualEra: z.string().trim().min(20).max(1000),
    worldRules: z.string().trim().min(20).max(1500),
    progression: z
      .string()
      .trim()
      .min(20)
      .max(1500)
      .describe(
        "One complete overview paragraph under 800 characters: name the seven-stage environmental arc and how ON_TRACK, NEUTRAL and FAR_BEHIND differ. Do not enumerate 21 chapter/state scenes; the later outline task supplies the detail. End with a complete sentence.",
      ),
    expressionRules: z.string().trim().min(20).max(1200),
  })
  .strict();

export const visualIntentSchema = z
  .object({
    productionBrief: productionBriefSchema.optional(),
    ownerDirection: z.string().max(20000).optional(),
    feeling: z.string().trim().min(8).max(500),
    demeanor: z.string().trim().min(8).max(500),
    anchors: z.string().trim().min(8).max(800),
    atmosphere: z.string().trim().min(8).max(500),
    avoid: z.string().trim().min(8).max(800),
  })
  .strict();

export type VisualIntent = z.infer<typeof visualIntentSchema>;
