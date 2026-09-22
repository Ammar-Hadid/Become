import { z } from "zod";
import { compensationSchema } from "@/features/finance/work-sources/schemas/work-source.schema";
import {
  ENGINEERING_CONTEXT_VALUES,
  ENGINEERING_EVIDENCE_TYPE_VALUES,
} from "@/features/engineering/constants/engineering.constants";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || null);

export const startSessionSchema = z.object({
  contentId: z.string().max(100).nullable().optional(),
  contentVariantId: z.string().max(100).nullable().optional(),
  domainId: z.string().min(1),
  activityTypeId: z.string().min(1),
  workSourceId: z.string().min(1).nullable().optional(),
  incomeOpportunityId: z.string().min(1).nullable().optional(),
  financeCompensationType: compensationSchema.nullable().optional(),
  businessCompanyId: z.string().min(1).nullable().optional(),
  businessNicheId: z.string().min(1).nullable().optional(),
  engineeringContext: z.enum(ENGINEERING_CONTEXT_VALUES).nullable().optional(),
  engineeringProjectId: z.string().min(1).nullable().optional(),
  description: optionalText,
});

export const completeSessionSchema = z.object({
  outcome: optionalText,
  notes: optionalText,
  businessCompanyId: z.string().min(1).nullable().optional(),
  businessNicheId: z.string().min(1).nullable().optional(),
  engineeringContext: z.enum(ENGINEERING_CONTEXT_VALUES).nullable().optional(),
  engineeringProjectId: z.string().min(1).nullable().optional(),
  engineeringEvidence: z
    .object({
      type: z.enum(ENGINEERING_EVIDENCE_TYPE_VALUES),
      title: z.string().trim().min(1).max(160),
      details: z
        .string()
        .trim()
        .max(5000)
        .optional()
        .transform((value) => value || null),
    })
    .nullable()
    .optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;

export const transitionSessionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
});

export const correctSessionEndSchema = z.object({
  endedAt: z.iso.datetime({ offset: true }),
  expectedEndedAt: z.iso.datetime({ offset: true }),
});
