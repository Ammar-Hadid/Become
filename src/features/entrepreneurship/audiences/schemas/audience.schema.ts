import { z } from "zod";
const text = (max = 6000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
export const marketTypes = ["UNKNOWN", "B2C", "B2B", "BOTH"] as const;
export const audienceContextSchema = z.object({
  marketType: z.enum(marketTypes).default("UNKNOWN"),
  segmentNames: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  segmentIds: z.array(z.string().min(1).max(80)).max(30).default([]),
  audienceDescription: text(),
});
export const audienceInputSchema = audienceContextSchema.extend({
  identityKind: z
    .enum(["UNSPECIFIED", "PERSON", "BUSINESS", "ANONYMOUS", "GROUP"])
    .default("UNSPECIFIED"),
  personId: text(80),
  personName: text(120),
  companyId: text(80),
  companyName: text(120),
  audienceLabel: text(1000),
  sampleSize: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive().max(2147483647).optional(),
  ),
  sampleUnit: text(120),
});
export type AudienceContextInput = z.input<typeof audienceContextSchema>;
export type AudienceInput = z.input<typeof audienceInputSchema>;
export const audienceRecordSchema = z.object({
  name: z.string().trim().min(1, "Give this a name.").max(120),
  description: text(),
  notes: text(),
  email: z
    .union([z.email(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  marketType: z.enum(marketTypes).default("UNKNOWN"),
  nicheId: text(80),
  expectedUpdatedAt: text(80),
});
