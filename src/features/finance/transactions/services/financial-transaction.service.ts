import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { transactionSchema } from "@/features/finance/transactions/schemas/financial-transaction.schema";
import { FinanceError } from "@/features/finance/types/finance.types";
import { invalidatePaymentAttribution } from "@/features/finance/payments/services/payment-invalidation.service";
import { resolveCounterpartyId } from "@/features/finance/counterparties/services/counterparty.service";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";

export async function transactionValues(
  tx: Prisma.TransactionClient,
  userId: string,
  input: unknown,
) {
  const parsed = transactionSchema.parse(input);
  const { amount, counterpartyName, ...data } = parsed;
  void amount;
  if (
    data.workSourceId &&
    !(await tx.workSource.findFirst({
      where: { id: data.workSourceId, userId, archivedAt: null },
    }))
  )
    throw new FinanceError("Work source is unavailable.");
  if (
    data.incomeOpportunityId &&
    !(await tx.incomeOpportunity.findFirst({
      where: { id: data.incomeOpportunityId, userId, archivedAt: null },
    }))
  )
    throw new FinanceError("Opportunity is unavailable.");
  const accountIds = [
    data.accountId,
    ...(data.destinationAccountId ? [data.destinationAccountId] : []),
  ];
  const sortedAccountIds = [...new Set(accountIds)].sort();
  if (data.type === "TRANSFER")
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM financial_account WHERE "userId" = ${userId} AND id IN (${Prisma.join(sortedAccountIds)}) ORDER BY id FOR UPDATE`,
    );
  else
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM financial_account WHERE "userId" = ${userId} AND id IN (${Prisma.join(sortedAccountIds)}) ORDER BY id FOR SHARE`,
    );
  const accounts = await tx.financialAccount.findMany({
    where: { id: { in: accountIds }, userId, archivedAt: null },
  });
  if (
    accounts.length !== new Set(accountIds).size ||
    accounts.some((account) => account.currency !== data.currency)
  )
    throw new FinanceError(
      "Choose active accounts in the same currency as the transaction.",
    );
  if (
    data.type === "TRANSFER" &&
    (!data.destinationAccountId || data.destinationAccountId === data.accountId)
  )
    throw new FinanceError(
      "A transfer requires two different accounts in the same currency.",
    );
  if (data.type === "INCOME" && !data.inflowKind)
    throw new FinanceError("Classify this inflow.");
  if (
    data.expenseCategoryId &&
    !(await tx.expenseCategory.findFirst({
      where: { id: data.expenseCategoryId, userId },
    }))
  )
    throw new FinanceError("Category is unavailable.");
  const counterpartyId =
    data.type === "TRANSFER"
      ? null
      : await resolveCounterpartyId(tx, userId, {
          id: data.counterpartyId,
          name: counterpartyName,
        });
  return {
    ...data,
    userId,
    counterpartyId,
    destinationAccountId:
      data.type === "TRANSFER" ? data.destinationAccountId : null,
    expenseCategoryId: data.type === "EXPENSE" ? data.expenseCategoryId : null,
    inflowKind: data.type === "INCOME" ? data.inflowKind : null,
  };
}

async function assertTransferFunds(
  tx: Prisma.TransactionClient,
  userId: string,
  data: { type: string; accountId: string; amountMinor: bigint },
  excludingTransactionId?: string,
) {
  if (data.type !== "TRANSFER") return;
  const currentPosition = (
    await getFinancialPosition(userId, new Date(), tx, excludingTransactionId)
  ).find((account) => account.id === data.accountId);
  if (currentPosition?.balanceMinor === null)
    throw new FinanceError(
      "Reconcile the source account before transferring from it; its current recorded balance is unknown.",
    );
  if (
    currentPosition === undefined ||
    data.amountMinor > currentPosition.balanceMinor
  )
    throw new FinanceError(
      "Transfer amount exceeds the source account's available recorded balance.",
    );
}

export async function saveFinancialTransaction(
  userId: string,
  input: unknown,
  id?: string,
) {
  return prisma.$transaction(async (tx) => {
    if (id) await lockFinancialTransaction(tx, userId, id);
    const data = await transactionValues(tx, userId, input);
    await assertTransferFunds(tx, userId, data, id);
    if (id) {
      const old = await tx.financialTransaction.findUniqueOrThrow({
        where: { id, userId },
      });
      const paymentSum = await tx.paymentSessionAllocation.aggregate({
        where: { userId, transactionId: id },
        _sum: { amountMinor: true },
      });
      if (
        paymentSum._sum.amountMinor !== null &&
        (data.type !== "INCOME" ||
          data.inflowKind !== "EARNED_WORK" ||
          data.currency !== old.currency ||
          data.amountMinor < paymentSum._sum.amountMinor)
      )
        throw new FinanceError(
          "Correct payment allocations before changing type, currency, classification or reducing below allocated money.",
        );
      if (
        old.amountMinor !== data.amountMinor ||
        old.currency !== data.currency ||
        old.occurredAt.getTime() !== data.occurredAt.getTime() ||
        old.workSourceId !== data.workSourceId ||
        old.incomeOpportunityId !== data.incomeOpportunityId ||
        old.inflowKind !== data.inflowKind
      )
        await invalidatePaymentAttribution(tx, userId, id);
      if (
        old.recurringExpenseOccurrenceId &&
        (data.type !== "EXPENSE" || data.currency !== old.currency)
      )
        throw new FinanceError(
          "A recurring posting must remain an expense in its original currency.",
        );
      const allocations = await tx.savingsGoalExpenseAllocation.findMany({
        where: { userId, transactionId: id },
        include: { goal: true },
      });
      if (
        allocations.length &&
        (data.type !== "EXPENSE" ||
          allocations.some(
            (allocation) => allocation.goal.currency !== data.currency,
          ) ||
          allocations.reduce(
            (sum, allocation) => sum + allocation.amountMinor,
            0n,
          ) > data.amountMinor)
      )
        throw new FinanceError(
          "Correct goal spending allocations before changing this expense's type, currency or amount below its allocations.",
        );
    }
    const record = id
      ? await tx.financialTransaction.update({ where: { id, userId }, data })
      : await tx.financialTransaction.create({ data });
    return { id: record.id };
  });
}
export async function lockFinancialTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM financial_transaction WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
  if (!rows.length) throw new FinanceError("Transaction not found.");
}
export async function deleteFinancialTransaction(userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, id);
    const record = await tx.financialTransaction.findUniqueOrThrow({
      where: { id, userId },
    });
    await invalidatePaymentAttribution(tx, userId, id);
    await tx.savingsGoal.updateMany({
      where: {
        userId,
        status: "COMPLETED",
        expenses: { some: { transactionId: id } },
      },
      data: { completionNeedsReviewAt: new Date() },
    });
    await tx.financialTransaction.delete({ where: { id, userId } });
    if (record.recurringExpenseOccurrenceId)
      await tx.recurringExpenseOccurrence.update({
        where: { id: record.recurringExpenseOccurrenceId, userId },
        data: { status: "AWAITING_CONFIRMATION", resolvedAt: null },
      });
  });
}
