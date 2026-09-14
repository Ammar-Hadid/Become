import { z } from "zod";
import { reviewIdentitySchema } from "@/features/reviews/contracts/schemas/review.schema";
import { currencySchema } from "@/lib/money/schemas/currency.schema";

const id = z.string().min(1).max(200);
const cursor = z.string().max(1500).optional();
const fingerprint = z.string().length(64).optional();
const period = reviewIdentitySchema.shape;
const audienceScope = {
  nicheId: id.optional(),
  personId: id.optional(),
  companyId: id.optional(),
  segmentId: id.optional(),
  marketType: z
    .enum(["UNKNOWN", "B2C", "B2B", "BOTH", "UNRECORDED"])
    .optional(),
};
export const targetedRetrievalSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("ENTREPRENEURSHIP_EVIDENCE"),
      ...period,
      ...audienceScope,
      cursor,
      fingerprint,
    })
    .strict(),
  z
    .object({
      type: z.literal("ENTREPRENEURSHIP_RECEIPTS"),
      ...period,
      ...audienceScope,
      currency: currencySchema,
      cursor,
      fingerprint,
    })
    .strict(),
  z
    .object({
      type: z.literal("FOCUSED_TIME"),
      ...period,
      domainId: id.optional(),
      cursor,
      fingerprint,
    })
    .strict(),
  z
    .object({
      type: z.literal("INCOME"),
      ...period,
      currency: currencySchema,
      classification: z
        .enum([
          "EARNED_WORK",
          "BUSINESS_REVENUE",
          "STUDENT_FINANCE",
          "GIFT",
          "REFUND",
          "REIMBURSEMENT",
          "OTHER",
        ])
        .optional(),
      workSourceId: id.optional(),
      companyId: id.optional(),
      cursor,
      fingerprint,
    })
    .strict()
    .refine(
      (v) => !(v.companyId && (v.workSourceId || v.classification)),
      "Company receipts are a separate allocation perspective; do not combine them with a transaction classification or Work Source filter.",
    ),
  z
    .object({
      type: z.literal("DECISIONS"),
      q: z.string().trim().max(200).optional(),
      ...period,
      cursor,
      fingerprint,
    })
    .strict(),
  z
    .object({
      type: z.literal("DECISION"),
      id,
      section: z.enum(["changes", "reflections"]).default("changes"),
      cursor,
      fingerprint,
    })
    .strict(),
  z.object({ type: z.literal("GOAL"), id, cursor, fingerprint }).strict(),
  z.object({ type: z.literal("EXPERIMENT"), id, cursor, fingerprint }).strict(),
  z
    .object({
      type: z.literal("SOURCE"),
      ...period,
      sourceKey: z.string().min(1).max(500),
      editionId: id.optional(),
      fingerprint,
    })
    .strict(),
]);
export type TargetedRetrievalRequest = z.infer<typeof targetedRetrievalSchema>;
export const currentContextRequestSchema = z
  .object({
    domains: z
      .array(
        z.enum([
          "sessions",
          "engineering",
          "finance",
          "entrepreneurship",
          "content",
          "direction",
          "ideas",
          "decisions",
        ]),
      )
      .min(1)
      .max(8)
      .default(["sessions", "engineering", "finance", "content", "decisions"]),
  })
  .strict();
