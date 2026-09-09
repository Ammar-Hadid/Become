import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  getFinancialPosition,
  sumPosition,
} from "@/features/finance/accounts/queries/financial-position.query";
import {
  goalFunding,
  savingsPool,
} from "@/features/finance/savings/utils/savings.util";
export async function getSavings(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
) {
  const [position, policies, goals] = await Promise.all([
    getFinancialPosition(userId, new Date(), tx),
    tx.financeCurrencyPolicy.findMany({ where: { userId } }),
    tx.savingsGoal.findMany({
      where: { userId },
      include: { expenses: { select: { amountMinor: true } } },
      orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const liquid = sumPosition(
    position.filter((account) => account.includeInLiquidSavings),
  );
  const currencies = new Set([
    ...liquid.keys(),
    ...policies.map((p) => p.currency),
    ...goals.map((g) => g.currency),
  ]);
  return {
    goals: goals.map(({ expenses, ...goal }) => ({
      ...goal,
      funding: goalFunding(
        goal.targetAmountMinor,
        expenses.reduce((sum, expense) => sum + expense.amountMinor, 0n),
        goal.allocatedAmountMinor,
      ),
    })),
    pools: [...currencies].sort().map((currency) => ({
      currency,
      ...savingsPool(
        liquid.get(currency) === undefined ? 0n : liquid.get(currency)!,
        policies.find((p) => p.currency === currency)?.protectedReserveMinor ??
          null,
        goals
          .filter((g) => g.currency === currency && !g.archivedAt)
          .reduce((sum, g) => sum + g.allocatedAmountMinor, 0n),
      ),
    })),
  };
}
