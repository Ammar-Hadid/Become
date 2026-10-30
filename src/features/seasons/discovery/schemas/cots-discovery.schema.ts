import { z } from "zod";
import { COTS_CATEGORIES } from "@/features/seasons/discovery/constants/cots-category.constants";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
export const cotsCategorySchema = z.enum(COTS_CATEGORIES.map((v) => v.value));
export const cotsIdentityCommand = seasonIdentitySchema.extend({
  displayName: z.string().trim().min(1).max(200),
  sourceCategory: cotsCategorySchema,
  sourceWork: z.string().trim().max(200).default(""),
  adaptation: z.string().trim().max(200).default(""),
  language: z.enum(["en", "nl", "ja"]).default("en"),
  externalId: z
    .string()
    .regex(/^(?:Q\d+|anilist:\d+)$/)
    .max(30)
    .optional(),
  expectedIdentityRevision: z.number().int().min(0),
  association: z.enum(["SAME", "NEW"]).optional(),
});
