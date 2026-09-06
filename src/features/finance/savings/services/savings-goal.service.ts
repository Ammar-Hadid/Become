import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { savingsGoalSchema } from "@/features/finance/savings/schemas/savings-goal.schema";
import { lockCurrencyPolicy } from "@/features/finance/settings/services/finance-policy.service";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import { normalizeCurrency, parseMoney } from "@/lib/money/utils/money.util";

export async function saveSavingsGoal(
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = savingsGoalSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await lockCurrencyPolicy(tx, userId, data.currency);
    const existing = id
      ? await tx.savingsGoal.findFirst({
          where: { id, userId },
          include: { expenses: true },
        })
      : null;
    if (id && (!existing || existing.archivedAt))
      throw new FinanceError("Goal is unavailable.");
    if (existing && existing.currency !== data.currency)
      throw new FinanceError("Goal currency cannot change.");
    const spent =
      existing?.expenses.reduce(
        (sum, expense) => sum + expense.amountMinor,
        0n,
      ) ?? 0n;
    if (data.targetAmountMinor < spent && !data.confirmBelowSpent)
      throw new FinanceError(
        "The new target is below confirmed spending. Explicitly confirm this correction.",
      );
    const values = {
      userId,
      name: data.name,
      currency: data.currency,
      targetAmountMinor: data.targetAmountMinor,
      status: data.status,
      completedAt:
        data.status === "COMPLETED"
          ? (existing?.completedAt ?? new Date())
          : null,
      completionNeedsReviewAt: null,
    };
    return id
      ? tx.savingsGoal.update({ where: { id, userId }, data: values })
      : tx.savingsGoal.create({ data: values });
  });
}

export async function rebalanceSavings(
  userId: string,
  inputCurrency: string,
  entries: { id: string; amount: string }[],
) {
  const currency = normalizeCurrency(inputCurrency);
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
    throw new FinanceError("A goal can only appear once.");
  await prisma.$transaction(async (tx) => {
    await lockCurrencyPolicy(tx, userId, currency);
    const savings = await getSavings(userId, tx);
    const goals = savings.goals.filter(
      (goal) => goal.currency === currency && !goal.archivedAt,
    );
    let finalTotal = goals.reduce(
      (sum, goal) => sum + goal.allocatedAmountMinor,
      0n,
    );
    let hasIncrease = false;
    const changes = entries.map((entry) => {
      const goal = goals.find((goal) => goal.id === entry.id);
      if (!goal) throw new FinanceError("Goal is unavailable.");
      let amount: bigint;
      try {
        amount = parseMoney(entry.amount, currency);
      } catch (error) {
        throw new FinanceError((error as Error).message);
      }
      if (amount < 0n) throw new FinanceError("Allocation cannot be negative.");
      if (amount > goal.allocatedAmountMinor) {
        hasIncrease = true;
        if (amount > goal.funding.remaining)
          throw new FinanceError(
            "Allocation increases cannot exceed the remaining goal cost.",
          );
      }
      finalTotal += amount - goal.allocatedAmountMinor;
      return { id: goal.id, amount };
    });
    if (hasIncrease) {
      const capacity = savings.pools.find(
        (pool) => pool.currency === currency,
      )?.aboveReserve;
      if (capacity === null || capacity === undefined)
        throw new FinanceError(
          "Reconcile every liquid savings account before increasing allocations.",
        );
      if (finalTotal > capacity)
        throw new FinanceError(
          "The final plan exceeds available savings above reserve.",
        );
    }
    for (const change of changes)
      await tx.savingsGoal.update({
        where: { id: change.id, userId },
        data: { allocatedAmountMinor: change.amount },
      });
  });
}
export async function archiveSavingsGoal(
  userId: string,
  id: string,
  release: boolean,
) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw new FinanceError("Goal not found.");
  await prisma.$transaction(async (tx) => {
    await lockCurrencyPolicy(tx, userId, goal.currency);
    const current = await tx.savingsGoal.findUniqueOrThrow({
      where: { id, userId },
    });
    if (current.allocatedAmountMinor > 0n && !release)
      throw new FinanceError(
        "Explicitly release the remaining allocation before archiving.",
      );
    await tx.savingsGoal.update({
      where: { id, userId },
      data: { archivedAt: new Date(), allocatedAmountMinor: 0n },
    });
  });
}
