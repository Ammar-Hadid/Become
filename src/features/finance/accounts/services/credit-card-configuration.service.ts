import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { parseMoney } from "@/lib/money/utils/money.util";
import { FinanceError } from "@/features/finance/types/finance.types";
import { creditCardConfigurationSchema } from "../schemas/credit-card-configuration.schema";

export async function updateCreditCardConfiguration(
  userId: string,
  accountId: string,
  input: unknown,
) {
  const data = creditCardConfigurationSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id=${accountId} AND "userId"=${userId} FOR NO KEY UPDATE`;
    const card = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, type: "CREDIT_CARD", archivedAt: null },
    });
    if (!card) throw new FinanceError("Choose an active owned credit card.");
    if (
      data.repaymentMethod === "LINKED_ACCOUNT" &&
      !(await tx.financialAccount.findFirst({
        where: {
          id: data.settlementAccountId!,
          userId,
          archivedAt: null,
          currency: card.currency,
          type: { notIn: ["CREDIT_CARD", "INVESTMENT"] },
        },
      }))
    )
      throw new FinanceError(
        "Choose an active owned settlement account in the same currency.",
      );
    const amount = (value: string) => {
      if (!value) return null;
      const parsed = parseMoney(value, card.currency);
      if (parsed < 0n)
        throw new FinanceError(
          "Card limits and statement amounts cannot be negative.",
        );
      return parsed;
    };
    await tx.financialAccount.update({
      where: { id: card.id, userId },
      data: {
        repaymentMethod: data.repaymentMethod,
        settlementAccountId:
          data.repaymentMethod === "LINKED_ACCOUNT"
            ? data.settlementAccountId
            : null,
        creditLimitMinor: amount(data.creditLimit),
        statementBalanceMinor: amount(data.statementBalance),
        statementDueMinor: amount(data.statementDue),
        statementDueOn: data.statementDueOn || null,
        settlementDay: data.settlementDay,
      },
    });
    return { id: card.id };
  });
}
