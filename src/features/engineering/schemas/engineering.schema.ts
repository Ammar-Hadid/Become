import { DateTime } from "luxon";
import { z } from "zod";
import {
  ENGINEERING_CONTEXT_VALUES,
  ENGINEERING_EVIDENCE_TYPE_VALUES,
  ENGINEERING_PROJECT_STATUS_VALUES,
} from "@/features/engineering/constants/engineering.constants";

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);
}

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid http or https URL.")
  .transform((value) => value || null);

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || DateTime.fromISO(value).isValid,
    "Enter a valid date.",
  )
  .transform((value) => value || null);

export const engineeringProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a project name.").max(120),
    description: optionalText(2000),
    context: z.enum(ENGINEERING_CONTEXT_VALUES),
    status: z.enum(ENGINEERING_PROJECT_STATUS_VALUES),
    repositoryUrl: optionalUrl,
    liveUrl: optionalUrl,
    notes: optionalText(5000),
    startedOn: optionalDate,
    completedOn: optionalDate,
    technologyIds: z.array(z.string().min(1)).max(30).default([]),
    customTechnologyNames: z
      .array(z.string().trim().min(1).max(80))
      .max(10)
      .default([]),
  })
  .superRefine((project, context) => {
    if (
      project.startedOn &&
      project.completedOn &&
      project.completedOn < project.startedOn
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedOn"],
        message: "Completion date cannot be before the start date.",
      });
    }
    if (
      project.technologyIds.length + project.customTechnologyNames.length >
      30
    ) {
      context.addIssue({
        code: "custom",
        path: ["technologyIds"],
        message: "Choose no more than 30 technologies.",
      });
    }
  });

export const engineeringEvidenceSchema = z.object({
  type: z.enum(ENGINEERING_EVIDENCE_TYPE_VALUES),
  title: z.string().trim().min(1, "Enter an evidence title.").max(160),
  details: optionalText(5000),
  occurredAt: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => DateTime.fromISO(value).isValid,
      "Enter a valid date and time.",
    ),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  sessionId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

export type EngineeringProjectInput = z.infer<typeof engineeringProjectSchema>;
export type EngineeringEvidenceInput = z.infer<
  typeof engineeringEvidenceSchema
>;
