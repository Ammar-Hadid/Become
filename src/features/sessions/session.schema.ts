import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || null);

export const startSessionSchema = z.object({
  domainId: z.string().min(1),
  activityTypeId: z.string().min(1),
  description: optionalText,
});

export const completeSessionSchema = z.object({
  outcome: optionalText,
  notes: optionalText,
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
