import { z } from "zod";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { optionalText } from "@/features/entrepreneurship/market/schemas/market.schema";
export const interactionKinds = [
  "OUTREACH_SENT",
  "REPLY_RECEIVED",
  "CONVERSATION",
  "ATTEMPT_NO_CONTACT",
] as const;
export const channels = [
  "EMAIL",
  "CALL",
  "MEETING",
  "DM",
  "IN_PERSON",
  "OTHER",
] as const;
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine(
    (value) => DateTime.fromISO(value, { zone: APP_TIMEZONE }).isValid,
    "Choose a valid date.",
  )
  .transform((value) =>
    DateTime.fromISO(value, { zone: APP_TIMEZONE }).startOf("day").toJSDate(),
  );
export const occurredDaySchema = daySchema.refine(
  (value) => value <= new Date(),
  "Record an event that has already happened.",
);
export const calendarDaySchema = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid,
    "Choose a valid date.",
  )
  .transform((value) => DateTime.fromISO(value, { zone: "UTC" }).toJSDate());
export const observationInputSchema = z
  .object({
    kind: z
      .enum([
        "CUSTOMER_STATEMENT",
        "OBSERVED_BEHAVIOR",
        "INTEREST",
        "COMMITMENT",
        "CONTEXT",
      ])
      .default("CUSTOMER_STATEMENT"),
    wordingMode: z.enum(["QUOTE", "PARAPHRASE"]).default("PARAPHRASE"),
    statement: z
      .string()
      .trim()
      .min(1, "Record what was said or observed.")
      .max(6000),
    sourceDescription: z
      .string()
      .trim()
      .min(1, "Keep the source excerpt or context.")
      .max(6000),
    problemId: optionalText(80),
    stance: z.enum(["SUPPORTS", "CONTRADICTS", "CONTEXT"]).default("CONTEXT"),
    explanation: optionalText(),
  })
  .refine(
    (value) => !value.problemId || Boolean(value.explanation),
    "Explain how this observation relates to the problem.",
  );
export const interactionSchema = z.object({
  sourceSessionId: optionalText(80),
  kind: z.enum(interactionKinds),
  channel: z.enum(channels).default("OTHER"),
  occurredAt: occurredDaySchema,
  summary: z.string().trim().min(1, "Add a short summary.").max(3000),
  notes: optionalText(),
  companyId: optionalText(80),
  companyName: optionalText(120),
  nicheId: optionalText(80),
  respondsToInteractionId: optionalText(80),
  participants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        role: optionalText(120),
        email: z.email().optional(),
      }),
    )
    .max(30)
    .default([]),
  observations: z.array(observationInputSchema).max(30).default([]),
  followUp: z
    .object({
      title: z.string().trim().min(1).max(200),
      dueOn: z
        .union([calendarDaySchema, z.literal("")])
        .optional()
        .transform((v) => v || null),
    })
    .optional(),
});
export const correctionSchema = interactionSchema.extend({
  expectedVersion: z.number().int().positive(),
  correctionReason: z
    .string()
    .trim()
    .min(1, "Explain the correction.")
    .max(2000),
  meaningUnchanged: z.boolean().default(false),
});
export const batchOutreachSchema = z.object({
  nicheId: optionalText(80),
  notes: optionalText(),
  overrides: z
    .record(
      z.string(),
      z.object({
        summary: z
          .string()
          .trim()
          .min(1, "Add a summary.")
          .max(3000)
          .optional(),
        channel: z.enum(channels).optional(),
        occurredAt: occurredDaySchema.optional(),
        notes: z
          .string()
          .trim()
          .max(6000)
          .transform((v) => v || null)
          .optional(),
      }),
    )
    .default({}),
  companyIds: z
    .array(z.string().min(1))
    .min(1, "Select the companies you actually contacted.")
    .max(200),
  occurredAt: occurredDaySchema,
  summary: z.string().trim().min(1).max(3000),
  channel: z.enum(channels),
  confirmedSent: z.literal(true, {
    error: "Confirm these messages were actually sent.",
  }),
});
