import { audienceInputSchema } from "@/features/entrepreneurship/audiences/schemas/audience.schema";
import { z } from "zod";
import { optionalText } from "@/features/entrepreneurship/market/schemas/market.schema";
import {
  occurredDaySchema,
  observationInputSchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
export const problemSchema = z.object({
  ...audienceInputSchema.shape,
  title: z.string().trim().min(1).max(200),
  initialStatement: z
    .string()
    .trim()
    .min(1, "State the belief you want to examine.")
    .max(6000),
  origin: z.enum(["USER_HYPOTHESIS", "OBSERVATION_LED"]),
  nicheId: optionalText(80),
  notes: optionalText(),
});
export const evidenceSchema = z.object({
  observationId: z.string().min(1),
  observationRevisionId: z.string().min(1),
  stance: z.enum(["SUPPORTS", "CONTRADICTS", "CONTEXT"]),
  explanation: z
    .string()
    .trim()
    .min(1, "Explain what this source means for the problem.")
    .max(6000),
});
export const sourcedObservationSchema = observationInputSchema.safeExtend({
  ...audienceInputSchema.shape,
  audienceOverride: z.boolean().default(false),
  audienceReason: optionalText(2000),
  sourceKind: z.enum(["INTERACTION", "DIRECT_OBSERVATION", "PUBLIC_SOURCE"]),
  observedAt: occurredDaySchema,
  companyId: optionalText(80),
  companyName: optionalText(120),
  nicheId: optionalText(80),
  interactionId: optionalText(80),
  interactionRevisionId: optionalText(80),
  sourceUrl: z
    .union([z.url({ protocol: /^https?$/ }), z.literal("")])
    .optional()
    .transform((v) => v || null),
});
export const assessmentSchema = z.object({
  state: z.enum([
    "INVESTIGATING",
    "SUPPORTED_FOR_SCOPE",
    "INCONCLUSIVE",
    "REJECTED",
  ]),
  scope: z
    .string()
    .trim()
    .min(1, "Define the scope of this judgment.")
    .max(6000),
  rationale: z.string().trim().min(1, "Explain your judgment.").max(6000),
  assessedAt: occurredDaySchema,
  evidenceIds: z.array(z.string()).max(200).default([]),
});
