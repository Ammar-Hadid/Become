import { z } from "zod";
import {
  dayInput,
  operationKey,
  goalDraftSchema,
  experimentDraftSchema,
} from "@/features/direction/schemas/direction.schema";
import {
  contentIdSchema as id,
  contentIntentSchema,
  contentFormatSchema,
} from "@/features/content/schemas/content.schema";
export const ideaDraftSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Save a thought or a working title.")
      .max(500),
    notes: z.string().max(12000),
    domainIds: z.array(id).max(20),
  })
  .strict();
const contextIds = {
  contentId: id.optional(),
  projectId: id.optional(),
  goalId: id.optional(),
  experimentId: id.optional(),
  nicheId: id.optional(),
  seasonId: id.optional(),
};
export const decisionDraftSchema = z
  .object({
    ...contextIds,
    choice: z.string().trim().min(1, "What did you decide?").max(500),
    reason: z
      .string()
      .trim()
      .min(1, "Why did you choose this path?")
      .max(12000),
    decidedOn: dayInput,
    context: z.string().max(12000),
    alternatives: z.string().max(6000),
    expectedOutcome: z.string().max(6000),
    reconsiderWhen: z.string().max(6000),
    reviewOn: dayInput.nullable(),
  })
  .strict()
  .refine((v) => !v.reviewOn || v.reviewOn >= v.decidedOn, {
    message: "Choose a review date on or after the decision.",
    path: ["reviewOn"],
  });
const base = { operationKey };
export const thinkingCommandSchema = z.union([
  z
    .object({
      ...base,
      type: z.literal("SAVE_IDEA"),
      id: id.optional(),
      expectedVersion: z.number().int().positive().optional(),
      draft: ideaDraftSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("ARCHIVE_IDEA"),
      id,
      expectedVersion: z.number().int().positive(),
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("PROMOTE_IDEA"),
      ideaId: id,
      destination: z.literal("CONTENT"),
      draft: contentIntentSchema,
      format: contentFormatSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("PROMOTE_IDEA"),
      ideaId: id,
      destination: z.literal("GOAL"),
      draft: goalDraftSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("PROMOTE_IDEA"),
      ideaId: id,
      destination: z.literal("EXPERIMENT"),
      draft: experimentDraftSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("LINK_IDEA"),
      ideaId: id,
      destination: z.enum(["CONTENT", "GOAL", "EXPERIMENT"]),
      destinationId: id,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("SAVE_DECISION"),
      id: id.optional(),
      expectedVersion: z.number().int().positive().optional(),
      draft: decisionDraftSchema,
      changeReason: z.string().trim().max(2000).optional(),
      supersedesId: id.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("ARCHIVE_DECISION"),
      id,
      expectedVersion: z.number().int().positive(),
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("REFLECT_DECISION"),
      id,
      assessment: z.enum(["HELPFUL", "MIXED", "NOT_HELPFUL", "TOO_EARLY"]),
      reflection: z.string().trim().min(1).max(12000),
      reflectedOn: dayInput,
    })
    .strict(),
]);
