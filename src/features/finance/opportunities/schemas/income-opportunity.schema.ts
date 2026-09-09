import { z } from "zod";
import {
  currencySchema,
  financeName,
  financeNotes,
  localTimestamp,
  moneyValue,
} from "@/features/finance/schemas/finance.schema";
import { compensationSchema } from "@/features/finance/work-sources/schemas/work-source.schema";
const optionalTimestamp = z
  .union([localTimestamp, z.literal("").transform(() => null)])
  .optional()
  .nullable();
export const opportunitySchema = z
  .object({
    title: financeName,
    organizationName: z.string().trim().max(120).optional().nullable(),
    status: z.enum([
      "DISCOVERED",
      "APPLIED",
      "ASSESSMENT",
      "ACCEPTED",
      "REJECTED",
      "ABANDONED",
    ]),
    channel: z
      .enum([
        "DIRECT",
        "REFERRAL",
        "JOB_BOARD",
        "MARKETPLACE",
        "OUTREACH",
        "OTHER",
      ])
      .optional()
      .nullable(),
    discoveredAt: localTimestamp,
    appliedAt: optionalTimestamp,
    assessmentAt: optionalTimestamp,
    closedAt: optionalTimestamp,
    compensationType: compensationSchema.optional().nullable(),
    expectedAmount: z.string().optional(),
    expectedCurrency: z.union([currencySchema, z.literal("")]).optional(),
    notes: financeNotes,
  })
  .transform((data, context) => {
    const hasAmount = Boolean(data.expectedAmount?.trim());
    const hasCurrency = Boolean(data.expectedCurrency?.trim());
    if (hasAmount !== hasCurrency)
      context.addIssue({
        code: "custom",
        message:
          "Expected amount and currency must both be provided or both left blank.",
      });
    return {
      ...data,
      expectedAmountMinor:
        hasAmount && hasCurrency
          ? moneyValue(data.expectedAmount!, data.expectedCurrency!, context)
          : null,
      expectedCurrency: hasCurrency ? data.expectedCurrency! : null,
    };
  });
