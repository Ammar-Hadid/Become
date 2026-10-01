import { z } from "zod";
import {
  currencySchema,
  financeName,
  financeNotes,
  localTimestamp,
  moneyValue,
} from "@/features/finance/schemas/finance.schema";
export const accountSchema = z
  .object({
    name: financeName,
    type: z.enum([
      "CHECKING",
      "SAVINGS",
      "CASH",
      "DIGITAL_WALLET",
      "OTHER",
      "CREDIT_CARD",
      "INVESTMENT",
    ]),
    currency: currencySchema,
    includeInLiquidSavings: z.coerce.boolean(),
    dataSource: z
      .enum(["LIVE_SYNC", "STATEMENT_IMPORT", "MANUAL"])
      .default("MANUAL"),
    repaymentMethod: z.enum(["LINKED_ACCOUNT", "MANUAL"]).optional(),
    settlementAccountId: z
      .string()
      .transform((v) => v || null)
      .optional()
      .nullable(),
    creditLimit: z.string().optional(),
    statementDue: z.string().optional(),
    statementDueOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal(""))
      .optional(),
    settlementDay: z.coerce.number().int().min(1).max(31).optional(),
    balance: z.string(),
    reconciledAt: localTimestamp,
  })
  .superRefine((value, context) => {
    if (value.type === "CREDIT_CARD" && !value.repaymentMethod)
      context.addIssue({
        code: "custom",
        message: "Choose a repayment method.",
        path: ["repaymentMethod"],
      });
    if (
      value.type === "CREDIT_CARD" &&
      value.repaymentMethod === "LINKED_ACCOUNT" &&
      !value.settlementAccountId
    )
      context.addIssue({
        code: "custom",
        message: "Choose a settlement account for automatic repayment.",
        path: ["settlementAccountId"],
      });
  })
  .transform((value, context) => ({
    ...value,
    balanceMinor: moneyValue(value.balance, value.currency, context, true),
  }));
export const snapshotSchema = z.object({
  accountId: z.string().min(1),
  balance: z.string(),
  reconciledAt: localTimestamp,
  notes: financeNotes,
});
