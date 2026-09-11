import { z } from "zod";
import { COTS_CATEGORIES } from "@/features/seasons/discovery/constants/cots-category.constants";
export const seasonIdentitySchema = z.object({
  year: z.number().int().min(1900).max(2200),
  quarter: z.number().int().min(1).max(4),
});
const text = z.string().trim().max(6000);
export const seasonDraftSchema = z
  .object({
    title: z.string().trim().max(200),
    intention: text,
    stage: z.number().int().min(1).max(4),
    answers: z
      .object({
        carryForward: text,
        leaveBehind: text,
        protect: text,
        meaningful: text,
        deferredSteps: z.array(z.number().int().min(1).max(4)).max(4),
      })
      .strict(),
    character: z
      .object({
        sourceCategory: z
          .enum(COTS_CATEGORIES.map((v) => v.value))
          .nullable()
          .optional(),
        name: z.string().trim().max(200),
        sourceWork: z.string().trim().max(200),
        adaptation: z.string().trim().max(200),
        motivation: text,
        avoid: text,
        tone: z.enum(["DIRECT", "HARSH", "RUTHLESS"]),
        standards: z
          .array(
            z
              .object({
                key: z.string().min(1).max(100),
                trait: z.string().trim().max(160),
                behavior: text,
                goalId: z.string().max(100).optional(),
                criterionId: z.string().max(100).optional(),
              })
              .strict(),
          )
          .max(12),
      })
      .strict(),
  })
  .strict();
