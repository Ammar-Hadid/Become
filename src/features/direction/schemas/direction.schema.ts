import { currencySchema } from "@/lib/money/schemas/currency.schema";
import { z } from "zod";
import { DateTime } from "luxon";
export const dayInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a calendar date.")
  .refine(
    (value) => DateTime.fromISO(value, { zone: "Europe/Amsterdam" }).isValid,
    "Choose a valid date.",
  );
const optionalId = z
  .string()
  .max(100)
  .optional()
  .transform((value) => value || undefined);
const optionalDay = z
  .union([dayInput, z.literal("")])
  .optional()
  .transform((value) => value || undefined);
export const operationKey = z
  .string()
  .regex(/^[a-zA-Z0-9-]{16,80}$/, "Reopen the form before saving.");
export const criterionSchema = z
  .object({
    contentId: optionalId,
    channelId: optionalId,
    contentFormat: z.enum(["LONG_FORM", "SHORT_VERTICAL", "OTHER"]).optional(),
    selectedContentOnly: z.boolean().optional(),
    selectedOutreachOnly: z.boolean().optional(),
    id: optionalId,
    key: z.string().min(1).max(100),
    metric: z.enum([
      "MANUAL",
      "WORK_SOURCE_INCOME",
      "BUSINESS_RECEIPTS",
      "NEW_RECURRING_COMPANY",
      "CONVERSATIONS",
      "CONVERSATION_COMPANIES",
      "SESSION_TIME",
      "ENGINEERING_EVIDENCE",
      "ENGINEERING_PROJECT_COMPLETED",
      "SAVINGS_GOAL",
      "CONTENT_CREATED",
      "CONTENT_VARIANTS_CREATED",
      "CONTENT_PUBLICATIONS",
    ]),
    label: z.string().trim().max(200),
    target: z.string().trim().max(100),
    currency: z.union([currencySchema, z.literal("")]).optional(),
    startOn: optionalDay,
    endOn: optionalDay,
    workSourceId: optionalId,
    companyId: optionalId,
    offerRevisionId: optionalId,
    nicheId: optionalId,
    projectId: optionalId,
    domainId: optionalId,
    activityTypeId: optionalId,
    savingsGoalId: optionalId,
    evidenceType: z
      .enum([
        "FEATURE_COMPLETED",
        "BUG_SOLVED",
        "CONCEPT_LEARNED",
        "DEPLOYMENT",
        "ARCHITECTURE_DECISION",
        "TECHNICAL_DISCOVERY",
      ])
      .optional(),
    minimumReceived: z.string().trim().max(40).optional(),
    baselineAssertions: z
      .array(
        z
          .object({
            companyId: z.string().min(1).max(100),
            noPriorPaidRelationship: z.boolean(),
            note: z
              .string()
              .trim()
              .min(1, "Explain the history you reviewed.")
              .max(2000),
          })
          .strict(),
      )
      .max(100)
      .optional(),
  })
  .strict()
  .refine((v) => !v.startOn || !v.endOn || v.endOn >= v.startOn, {
    message: "End date must follow the start date.",
    path: ["endOn"],
  });
export const goalDraftSchema = z
  .object({
    title: z.string().trim().min(1, "Give this goal a title.").max(200),
    description: z.string().trim().max(6000).optional(),
    startOn: dayInput,
    targetOn: optionalDay,
    domainIds: z.array(z.string().min(1).max(100)).max(20),
    criterionMode: z.enum(["ALL", "ANY"]),
    criteria: z
      .array(criterionSchema)
      .max(8, "Use at most eight purposeful criteria."),
  })
  .strict()
  .refine((v) => !v.targetOn || v.targetOn >= v.startOn, {
    message: "Target date must follow the start date.",
    path: ["targetOn"],
  })
  .refine(
    (v) => new Set(v.criteria.map((c) => c.key)).size === v.criteria.length,
    { message: "Each criterion needs its own identity.", path: ["criteria"] },
  );
export const experimentDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    question: z.string().trim().min(1, "What are you testing?").max(6000),
    approach: z.string().trim().min(1, "Describe the approach.").max(6000),
    startOn: dayInput,
    targetOn: optionalDay,
    stoppingCondition: z.string().trim().max(3000).optional(),
    expectedEvidence: z.string().trim().max(6000).optional(),
    goalId: optionalId,
    repeatedFromId: optionalId,
    domainIds: z.array(z.string().min(1).max(100)).max(20),
    criterionMode: z.enum(["ALL", "ANY"]),
    criteria: z.array(criterionSchema).max(8),
    sourceContentIds: z.array(z.string().min(1).max(100)).max(200).optional(),
    sourceInteractionIds: z.array(z.string().min(1).max(100)).max(200),
  })
  .strict()
  .refine((v) => !v.targetOn || v.targetOn >= v.startOn, {
    message: "Target date must follow the start date.",
    path: ["targetOn"],
  })
  .refine((v) => Boolean(v.targetOn || v.stoppingCondition), {
    message: "Choose an end date or a stopping condition.",
    path: ["stoppingCondition"],
  })
  .refine(
    (v) => new Set(v.criteria.map((c) => c.key)).size === v.criteria.length,
    { message: "Each criterion needs its own identity.", path: ["criteria"] },
  );
