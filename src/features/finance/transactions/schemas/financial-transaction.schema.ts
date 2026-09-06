import { z } from "zod";
import {
  currencySchema,
  financeNotes,
  localTimestamp,
  moneyValue,
  optionalId,
} from "@/features/finance/schemas/finance.schema";
export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: z.string(),
    currency: currencySchema,
    occurredAt: localTimestamp,
    accountId: z.string().min(1, "Choose an account."),
    destinationAccountId: optionalId,
    workSourceId: optionalId,
    incomeOpportunityId: optionalId,
    inflowKind: z
      .enum([
        "EARNED_WORK",
        "BUSINESS_REVENUE",
        "STUDENT_FINANCE",
        "GIFT",
        "REFUND",
        "REIMBURSEMENT",
        "OTHER",
      ])
      .optional()
      .nullable(),
    expenseCategoryId: optionalId,
    counterpartyId: optionalId,
    counterpartyName: z
      .string()
      .trim()
      .max(120)
      .transform((name) => name || null)
      .optional()
      .nullable(),
    notes: financeNotes,
  })
  .superRefine((value, context) => {
    if (
      value.type === "TRANSFER" &&
      (value.counterpartyId || value.counterpartyName)
    )
      context.addIssue({
        code: "custom",
        message: "A transfer cannot have a counterparty.",
        path: ["counterpartyId"],
      });
  })
  .transform((value, context) => ({
    ...value,
    amountMinor: moneyValue(value.amount, value.currency, context),
  }))
  .refine(
    (value) => value.amountMinor > 0n,
    "Amount must be greater than zero.",
  );
