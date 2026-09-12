import { z } from "zod";
import { scriptDocumentSchema } from "@/features/content/scripts/schemas/content-script.schema";
import {
  dayInput,
  operationKey,
} from "@/features/direction/schemas/direction.schema";
export const contentIdSchema = z.string().min(1).max(100);
const version = z.number().int().positive();
export const contentFormatSchema = z.enum([
  "LONG_FORM",
  "SHORT_VERTICAL",
  "OTHER",
]);
export const contentIntentSchema = z
  .object({
    title: z.string().trim().min(1, "Give this work a working title.").max(240),
    purpose: z.string().max(6000),
    audience: z.string().max(3000),
    notes: z.string().max(12000),
  })
  .strict();
export const contentWritingSchema = z
  .object({
    hook: z.string().max(6000),
    outline: z.string().max(30000),
    productionNotes: z.string().max(12000),
  })
  .strict();
export const channelDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    platform: z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM", "OTHER"]),
    account: z.string().trim().max(160),
    platformLabel: z.string().trim().max(80).optional(),
  })
  .strict();
export const publicationDraftSchema = z
  .object({
    channelId: contentIdSchema,
    publishedTitle: z.string().trim().min(1).max(240),
    publishedOn: dayInput,
    publishedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    url: z.string().trim().max(2000),
    placement: z.string().trim().max(80),
  })
  .strict();
const counter = z
  .string()
  .regex(/^\d{1,16}$/, "Enter a nonnegative whole number.")
  .refine(
    (v) => BigInt(v) <= BigInt(Number.MAX_SAFE_INTEGER),
    "This counter is too large.",
  )
  .nullable();
export const observationDraftSchema = z
  .object({
    observedAt: z.iso.datetime({ offset: true }),
    views: counter,
    likes: counter,
    comments: counter,
    note: z.string().max(6000),
  })
  .strict()
  .refine(
    (v) => v.views !== null || v.likes !== null || v.comments !== null,
    "Enter at least one observed counter.",
  );
const base = { operationKey };
const owned = { ...base, contentId: contentIdSchema };
export const contentCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...owned,
      type: z.literal("SAVE_SCRIPT"),
      variantId: contentIdSchema,
      expectedScriptVersion: version,
      document: scriptDocumentSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("CREATE_CONTENT"),
      draft: contentIntentSchema,
      format: contentFormatSchema,
      ideaId: contentIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("SAVE_CONTENT"),
      expectedVersion: version,
      draft: contentIntentSchema,
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("ARCHIVE_CONTENT"),
      expectedVersion: version,
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("CREATE_VARIANT"),
      name: z.string().trim().min(1).max(120),
      format: contentFormatSchema,
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("SAVE_WRITING"),
      variantId: contentIdSchema,
      expectedWritingVersion: version,
      draft: contentWritingSchema,
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("SAVE_VARIANT"),
      variantId: contentIdSchema,
      expectedVersion: version,
      name: z.string().trim().min(1).max(120),
      format: contentFormatSchema,
      stage: z.enum(["PLANNING", "WRITING", "RECORDING", "EDITING", "READY"]),
      nextStep: z.string().max(2000),
      plannedOn: dayInput.nullable(),
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("SAVE_CHANNEL"),
      id: contentIdSchema.optional(),
      expectedVersion: version.optional(),
      draft: channelDraftSchema,
      archived: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("PUBLISH"),
      variantId: contentIdSchema,
      publications: z.array(publicationDraftSchema).min(1).max(20),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("CORRECT_PUBLICATION"),
      publicationId: contentIdSchema,
      expectedVersion: version,
      draft: publicationDraftSchema,
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("WITHDRAW_PUBLICATION"),
      publicationId: contentIdSchema,
      expectedVersion: version,
      withdrawn: z.boolean(),
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      ...owned,
      type: z.literal("RECORD_OBSERVATION"),
      publicationId: contentIdSchema,
      draft: observationDraftSchema,
      supersedesId: contentIdSchema.optional(),
      reason: z.string().trim().min(1).max(2000).optional(),
    })
    .strict(),
]);
