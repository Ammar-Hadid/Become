import { z } from "zod";
import { optionalText } from "@/features/entrepreneurship/market/schemas/market.schema";
import {
  observationInputSchema,
  calendarDaySchema,
  occurredDaySchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
export const quoteSchema = z.object({
  nicheId: optionalText(80),
  companyId: z.string().min(1, "Choose a company."),
  title: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1, "Describe what you are offering.").max(6000),
  terms: optionalText(),
  priceBasis: z.enum(["FIXED", "HOURLY", "PER_UNIT", "RECURRING"]),
  amount: optionalText(40),
  currency: z.string().trim().default("EUR"),
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
  nicheId: optionalText(80),
  observations: z.array(observationInputSchema).max(30).default([]),
  offerRevisionId: z.string().min(1),
  kind: z.enum([
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
