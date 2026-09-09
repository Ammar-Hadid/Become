import { z } from "zod";
export const optionalText = (max = 6000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Give this a name.")
  .max(120);
export const marketSchema = z.object({
  expectedUpdatedAt: optionalText(80),
  name: nameSchema,
  website: z
    .union([z.url({ protocol: /^https?$/ }), z.literal("")])
    .optional()
    .transform((v) => v || null),
  notes: optionalText(),
  scope: optionalText(),
  nicheIds: z.array(z.string()).max(30).default([]),
});
export const directionSchema = z.object({
  expectedUpdatedAt: optionalText(80),
  direction: z.enum(["EXPLORING", "PURSUING", "PAUSED", "STOPPED"]),
  rationale: z
    .string()
    .trim()
    .min(1, "Record why your direction changed.")
    .max(6000),
});
