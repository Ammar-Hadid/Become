import { audienceInputSchema } from "@/features/entrepreneurship/audiences/schemas/audience.schema";
import { currencySchema } from "@/lib/money/schemas/currency.schema";
import { z } from "zod";
import { optionalText } from "@/features/entrepreneurship/market/schemas/market.schema";
import {
  observationInputSchema,
  calendarDaySchema,
  occurredDaySchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
export const quoteSchema = z.object({
  expectedVersion: z.coerce.number().int().positive().optional(),
  ...audienceInputSchema.shape,
  mode: z.enum(["SPECIFIC", "AUDIENCE_TEST"]).default("SPECIFIC"),
  nicheId: optionalText(80),
  companyId: optionalText(80),
  title: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1, "Describe what you are offering.").max(6000),
  terms: optionalText(),
  priceBasis: z.enum(["FIXED", "HOURLY", "PER_UNIT", "RECURRING"]),
  amount: optionalText(40),
  currency: currencySchema.default("EUR"),
  unitLabel: optionalText(120),
  intervalUnit: z.enum(["DAY", "WEEK", "MONTH", "YEAR"]).optional(),
  intervalCount: z.coerce.number().int().positive().max(120).optional(),
  expiresOn: z
    .union([calendarDaySchema, z.literal("")])
    .optional()
    .transform((v) => v || null),
  problemIds: z.array(z.string()).max(30).default([]),
});
export const offerEventSchema = z.object({
  engagementId: optionalText(80),
  nicheId: optionalText(80),
  observations: z.array(observationInputSchema).max(30).default([]),
  offerRevisionId: z.string().min(1),
  kind: z.enum([
    "SHARED",
    "CLOSED",
    "REOPENED",
    "INTERESTED",
    "PROPOSED",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN",
    "EXPIRED",
    "SUPERSEDED",
    "CANCELLED",
  ]),
  occurredAt: occurredDaySchema,
  sourceDescription: z
    .string()
    .trim()
    .min(1, "Keep the source or reason for this outcome.")
    .max(6000),
  interactionId: optionalText(80),
  interactionRevisionId: optionalText(80),
});

export const offerResponseSchema = audienceInputSchema.extend({
  offerRevisionId: z.string().min(1),
  kind: z.enum(["INTERESTED", "ACCEPTED", "REJECTED"]),
  occurredAt: occurredDaySchema,
  sourceDescription: z
    .string()
    .trim()
    .min(1, "Keep the response source.")
    .max(6000),
  interactionId: optionalText(80),
  interactionRevisionId: optionalText(80),
});
