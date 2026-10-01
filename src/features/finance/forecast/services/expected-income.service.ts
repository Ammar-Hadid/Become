import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { expectedIncomeSchema } from "@/features/finance/forecast/schemas/expected-income.schema";
import { FinanceError } from "@/features/finance/types/finance.types";

export async function saveExpectedIncome(
  userId: string,
  input: unknown,
  id?: string,
) {
  const { amount, ...values } = expectedIncomeSchema.parse(input);
  void amount;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id=${values.accountId} AND "userId"=${userId} FOR SHARE`;
    const account = await tx.financialAccount.findFirst({
      where: {
        id: values.accountId,
        userId,
        currency: values.currency,
        archivedAt: null,
      },
    });
    if (!account || account.type === "CREDIT_CARD")
      throw new FinanceError(
        "Choose an active asset account in this currency.",
      );
    if (
      values.counterpartyId &&
      !(await tx.counterparty.findFirst({
        where: { id: values.counterpartyId, userId, archivedAt: null },
      }))
    )
      throw new FinanceError("Counterparty is unavailable.");
    if (
      id &&
      !(await tx.financeExpectedIncome.findFirst({
        where: { id, userId, archivedAt: null },
      }))
    )
      throw new FinanceError("Expected income is unavailable.");
    const data = {
      ...values,
      recurrenceFrequency: values.recurrenceFrequency ?? null,
      anchorDate: values.recurrenceFrequency ? values.dueOn : null,
      confirmedAt: new Date(),
    };
    return id
      ? tx.financeExpectedIncome.update({ where: { id, userId }, data })
      : tx.financeExpectedIncome.create({ data: { ...data, userId } });
  });
}
export async function archiveExpectedIncome(userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const result = await tx.financeExpectedIncome.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (!result.count)
      throw new FinanceError("Expected income is unavailable.");
  });
}
