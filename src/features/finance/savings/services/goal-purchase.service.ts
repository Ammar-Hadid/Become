import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { lockCurrencyPolicy } from "@/features/finance/settings/services/finance-policy.service";
import {
  lockFinancialTransaction,
  transactionValues,
} from "@/features/finance/transactions/services/financial-transaction.service";
import { parseMoney } from "@/lib/money/utils/money.util";

export async function allocateGoalExpense(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
  goalId: string,
  amountMinor: bigint,
) {
  const transaction = await tx.financialTransaction.findUniqueOrThrow({
    where: { id: transactionId, userId },
  });
  const goal = await tx.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  const previous = await tx.savingsGoalExpenseAllocation.findUnique({
    where: {
      savingsGoalId_transactionId: { savingsGoalId: goalId, transactionId },
    },
  });
  if (
    !goal ||
    (goal.archivedAt && !previous) ||
    transaction.type !== "EXPENSE" ||
    goal.currency !== transaction.currency ||
    amountMinor < 0n
  )
    throw new FinanceError(
      "Goal spending requires an expense and a current goal in the same currency.",
    );
  if (
    goal.status === "COMPLETED" &&
    (previous?.amountMinor ?? 0n) !== amountMinor
  )
    await tx.savingsGoal.update({
      where: { id: goal.id, userId },
      data: { completionNeedsReviewAt: new Date() },
    });
  const other = await tx.savingsGoalExpenseAllocation.aggregate({
    where: { transactionId, userId, savingsGoalId: { not: goalId } },
    _sum: { amountMinor: true },
  });
  if ((other._sum.amountMinor ?? 0n) + amountMinor > transaction.amountMinor)
    throw new FinanceError(
      "Goal spending allocations exceed the expense amount.",
    );
  if (amountMinor === 0n)
    await tx.savingsGoalExpenseAllocation.deleteMany({
      where: { userId, transactionId, savingsGoalId: goalId },
    });
  else
    await tx.savingsGoalExpenseAllocation.upsert({
      where: {
        savingsGoalId_transactionId: { savingsGoalId: goalId, transactionId },
      },
      create: { userId, savingsGoalId: goalId, transactionId, amountMinor },
      update: { amountMinor },
    });
}
export async function recordGoalPurchase(
  userId: string,
  goalId: string,
  input: unknown,
  spending: string,
  release: string,
  complete: boolean,
) {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId, archivedAt: null },
  });
  if (!goal) throw new FinanceError("Goal is unavailable.");
  return prisma.$transaction(async (tx) => {
    await lockCurrencyPolicy(tx, userId, goal.currency);
    const current = await tx.savingsGoal.findUniqueOrThrow({
      where: { id: goalId, userId },
    });
    const data = await transactionValues(tx, userId, input);
    if (data.type !== "EXPENSE")
      throw new FinanceError("A goal purchase must be an expense.");
    let amountMinor: bigint;
    let releaseMinor: bigint;
    try {
      amountMinor = parseMoney(spending, goal.currency);
      releaseMinor = parseMoney(release || "0", goal.currency);
    } catch (error) {
      throw new FinanceError((error as Error).message);
    }
    if (releaseMinor < 0n || releaseMinor > current.allocatedAmountMinor)
      throw new FinanceError(
        "Release must be between zero and the current allocation.",
      );
    const transaction = await tx.financialTransaction.create({ data });
    await allocateGoalExpense(tx, userId, transaction.id, goal.id, amountMinor);
    await tx.savingsGoal.update({
      where: { id: goal.id, userId },
      data: {
        allocatedAmountMinor: current.allocatedAmountMinor - releaseMinor,
        ...(complete
          ? {
              status: "COMPLETED",
              completedAt: new Date(),
              completionNeedsReviewAt: null,
            }
          : {}),
      },
    });
    return { id: transaction.id };
  });
}
export async function linkGoalExpense(
  userId: string,
  transactionId: string,
  goalId: string,
  amount: string,
) {
  await prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, transactionId);
    const transaction = await tx.financialTransaction.findUniqueOrThrow({
      where: { id: transactionId, userId },
    });
    let amountMinor: bigint;
    try {
      amountMinor = parseMoney(amount, transaction.currency);
    } catch (error) {
      throw new FinanceError((error as Error).message);
    }
    await allocateGoalExpense(tx, userId, transactionId, goalId, amountMinor);
  });
}
