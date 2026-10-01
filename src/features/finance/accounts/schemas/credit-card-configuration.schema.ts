import { z } from "zod";
import { DateTime } from "luxon";
import { optionalId } from "@/features/finance/schemas/finance.schema";

export const creditCardConfigurationSchema = z
  .object({
    bankName: z.string().trim().max(120).optional(),
    repaymentMethod: z.enum(["LINKED_ACCOUNT", "MANUAL"]),
    settlementAccountId: optionalId,
    creditLimit: z.string().trim().max(60).default(""),
    statementBalance: z.string().trim().max(60).default(""),
    statementDue: z.string().trim().max(60).default(""),
    statementDueOn: z
      .string()
      .trim()
      .default("")
      .refine(
        (value) =>
          !value ||
          (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
            DateTime.fromISO(value).isValid),
        "Enter a valid statement due date.",
      ),
    settlementDay: z.preprocess(
      (value) =>
        value === "" || value === undefined || value === null ? null : value,
      z.coerce.number().int().min(1).max(31).nullable(),
    ),
  })
  .superRefine((value, context) => {
    if (
      value.repaymentMethod === "LINKED_ACCOUNT" &&
      !value.settlementAccountId
    )
      context.addIssue({
        code: "custom",
        path: ["settlementAccountId"],
        message: "Choose a settlement account for automatic repayment.",
      });
  });
