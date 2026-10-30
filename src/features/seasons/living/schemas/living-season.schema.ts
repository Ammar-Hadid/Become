import { z } from "zod";
import {
  characterCoverageSchema,
  validateCharacterCoverage,
} from "./character-coverage.schema";

export const livingArtStateSchema = z.enum([
  "ON_TRACK",
  "NEUTRAL",
  "FAR_BEHIND",
]);
export const livingArtFormatSchema = z.enum(["DESKTOP", "MOBILE"]);
export const livingArtworkSlotSchema = z.object({
  chapter: z.number().int().min(1).max(7),
  state: livingArtStateSchema,
  format: livingArtFormatSchema,
});

const sourcedDetail = z.object({
  description: z.string().trim().min(1).max(600),
  sourceIds: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

export const livingCharacterProfileSchema = z
  .object({
    characterName: z.string().trim().min(1).max(120),
    sourceWork: z.string().trim().min(1).max(200),
    adaptation: z.string().trim().max(200),
    outputLanguage: z.literal("en"),
    coverage: characterCoverageSchema.optional(),
    sources: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(80),
          title: z.string().trim().min(1).max(300),
          url: z.url().optional(),
          notes: z.string().trim().max(1000),
        }),
      )
      .min(1)
      .max(30),
    personality: sourcedDetail
      .extend({ description: z.string().trim().min(1).max(2000) })
      .optional(),
    speechPatterns: z.array(sourcedDetail).min(1).max(16),
    signaturePhrases: z.array(sourcedDetail).max(12),
    canonReferences: z.array(sourcedDetail).max(20),
    responseToSuccess: z.string().trim().min(1).max(800),
    responseToSetback: z.string().trim().min(1).max(800),
    responseToRecovery: z.string().trim().min(1).max(800),
    visualDirection: z.string().trim().min(1).max(2000),
    visualBoundaries: z.string().trim().min(1).max(1500),
  })
  .strict()
  .superRefine((profile, ctx) => {
    const sourceIds = new Set(profile.sources.map((source) => source.id));
    if (sourceIds.size !== profile.sources.length)
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Source IDs must be unique.",
      });
    if (profile.coverage) {
      try {
        validateCharacterCoverage(profile.coverage, sourceIds);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["coverage"],
          message: "Story coverage must cite listed sources.",
        });
      }
      if (profile.coverage.gaps.length)
        ctx.addIssue({
          code: "custom",
          path: ["coverage"],
          message:
            "Resolve story coverage gaps before saving a complete profile.",
        });
    }
    if (profile.personality?.sourceIds.some((id) => !sourceIds.has(id)))
      ctx.addIssue({
        code: "custom",
        path: ["personality"],
        message: "Personality must cite a listed source.",
      });
    for (const group of [
      "speechPatterns",
      "signaturePhrases",
      "canonReferences",
    ] as const) {
      profile[group].forEach((item, index) => {
        if (item.sourceIds.some((id) => !sourceIds.has(id)))
          ctx.addIssue({
            code: "custom",
            path: [group, index],
            message: "Every detail must cite a listed source.",
          });
      });
    }
  });

export type LivingCharacterProfile = z.infer<
  typeof livingCharacterProfileSchema
>;
export type LivingArtworkSlot = z.infer<typeof livingArtworkSlotSchema>;
