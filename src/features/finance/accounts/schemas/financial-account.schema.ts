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
    type: z.enum(["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET", "OTHER"]),
    currency: currencySchema,
    includeInLiquidSavings: z.coerce.boolean(),
    balance: z.string(),
    reconciledAt: localTimestamp,
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
