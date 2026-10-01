import { DateTime } from "luxon";
import { z } from "zod";
import {
  currencySchema,
  financeName,
  moneyValue,
} from "@/features/finance/schemas/finance.schema";
export const expectedIncomeSchema = z
  .object({
    counterpartyId: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable()
      .transform((value) => (value === undefined ? undefined : value || null)),
    accountId: z.string().min(1),
    title: financeName,
    currency: currencySchema,
    amount: z.string(),
    dueOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) => DateTime.fromISO(value).isValid,
        "Choose a valid due date.",
      ),
    recurrenceFrequency: z
      .enum(["WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),
  })
  .transform((data, context) => ({
    ...data,
    amountMinor: moneyValue(data.amount, data.currency, context),
  }))
  .refine((data) => data.amountMinor > 0n, "Amount must be positive.");
