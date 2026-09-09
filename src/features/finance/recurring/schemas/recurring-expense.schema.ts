import { z } from "zod";
import { DateTime } from "luxon";
import {
  currencySchema,
  financeName,
  moneyValue,
  optionalId,
} from "@/features/finance/schemas/finance.schema";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => DateTime.fromISO(value).isValid,
    "Enter a valid calendar date.",
  )
  .transform((value) => new Date(`${value}T00:00:00Z`));
export const recurringSchema = z
  .object({
    name: financeName,
    amount: z.string(),
    currency: currencySchema,
    accountId: z.string().min(1),
    expenseCategoryId: optionalId,
    counterpartyId: optionalId,
    frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
    dayOfWeek: z.coerce.number().int().min(1).max(7).nullable(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).nullable(),
    monthOfYear: z.coerce.number().int().min(1).max(12).nullable(),
    startOn: date,
    endOn: z.union([date, z.literal("").transform(() => null)]),
    postingBehavior: z.enum(["ASK_TO_CONFIRM", "AUTOMATIC"]),
  })
  .superRefine((data, context) => {
    if (
      (data.frequency === "WEEKLY" && !data.dayOfWeek) ||
      (data.frequency !== "WEEKLY" && !data.dayOfMonth) ||
      (data.frequency === "YEARLY" && !data.monthOfYear)
    )
      context.addIssue({
        code: "custom",
        message: "Choose the schedule anchor.",
      });
    if (data.endOn && data.endOn < data.startOn)
      context.addIssue({
        code: "custom",
        message: "End date cannot precede start date.",
      });
  })
  .transform((data, context) => ({
    ...data,
    dayOfWeek: data.frequency === "WEEKLY" ? data.dayOfWeek : null,
    dayOfMonth: data.frequency !== "WEEKLY" ? data.dayOfMonth : null,
    monthOfYear: data.frequency === "YEARLY" ? data.monthOfYear : null,
    amountMinor: moneyValue(data.amount, data.currency, context),
  }))
  .refine((data) => data.amountMinor > 0n, "Amount must be positive.");
