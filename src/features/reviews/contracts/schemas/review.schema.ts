import { z } from "zod";
export const reviewIdentitySchema = z
  .object({
    timeframe: z.enum(["week", "month", "season", "year"]),
    startOn: z.iso.date(),
  })
  .strict();
export const reviewWritingSchema = z
  .object({
    reflection: z.string().max(6000),
    carryForward: z.string().max(6000),
    leaveBehind: z.string().max(6000),
    selectedMomentKeys: z.array(z.string().min(1).max(500)).max(12),
  })
  .strict();
const base = {
  ...reviewIdentitySchema.shape,
  operationKey: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
};
export const reviewCommandSchema = z.discriminatedUnion("type", [
  z
    .object({ ...base, type: z.literal("SAVE"), writing: reviewWritingSchema })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("FINALIZE"),
      fingerprint: z.string().length(64),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("AMEND"),
      fingerprint: z.string().length(64),
      supersedesId: z.string().min(1),
      writing: reviewWritingSchema,
    })
    .strict(),
]);
export const transitionCommandSchema = z
  .object({
    type: z.enum(["BEGIN", "ADVANCE", "DEFER", "SKIP", "COMPLETE", "RENEW"]),
    startOn: z.iso.date(),
    operationKey: z.string().uuid(),
    expectedVersion: z.number().int().nonnegative(),
    clientId: z.string().uuid(),
    factsFingerprint: z.string().length(64).optional(),
    previewReviewVersion: z.number().int().nonnegative().optional(),
    previewEditionId: z.string().min(1).max(200).nullable().optional(),
    movement: z.number().int().min(0).max(3).optional(),
  })
  .strict();
export type ReviewCommand = z.infer<typeof reviewCommandSchema>;
export type TransitionCommand = z.infer<typeof transitionCommandSchema>;
