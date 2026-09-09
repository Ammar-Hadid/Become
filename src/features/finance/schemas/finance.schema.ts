import { z } from "zod";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { parseMoney } from "@/lib/money/utils/money.util";

export const financeName = z.string().trim().min(1, "Enter a name.").max(120);
export const optionalId = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => value || null);
export const financeNotes = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .nullable()
  .transform((value) => value || null);
export { currencySchema } from "@/lib/money/schemas/currency.schema";
export function moneyValue(
  value: string,
  currency: string,
  context: z.RefinementCtx,
  allowNegative = false,
) {
  try {
    const amount = parseMoney(value, currency);
    if (!allowNegative && amount < 0n)
      throw new Error("Amount cannot be negative.");
    return amount;
  } catch (error) {
    context.addIssue({ code: "custom", message: (error as Error).message });
    return z.NEVER;
  }
}
export const localTimestamp = z.string().transform((value, context) => {
  const date = DateTime.fromISO(value, { zone: APP_TIMEZONE });
  if (!date.isValid || date > DateTime.now()) {
    context.addIssue({
      code: "custom",
      message: "Enter a valid observed date and time, at or before now.",
    });
    return z.NEVER;
  }
  return date.toUTC().toJSDate();
});
