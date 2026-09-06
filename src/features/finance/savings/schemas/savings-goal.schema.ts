import { z } from "zod";
import {
  currencySchema,
  financeName,
  moneyValue,
} from "@/features/finance/schemas/finance.schema";
export const savingsGoalSchema = z
  .object({
    name: financeName,
    currency: currencySchema,
    target: z.string(),
    status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).default("ACTIVE"),
    confirmBelowSpent: z.boolean().default(false),
  })
  .transform((data, context) => ({
    ...data,
    targetAmountMinor: moneyValue(data.target, data.currency, context),
  }))
  .refine((data) => data.targetAmountMinor > 0n, "Target must be positive.");
