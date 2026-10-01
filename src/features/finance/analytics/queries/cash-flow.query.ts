import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getFinanceCoverage } from "@/features/finance/measurements/queries/finance-coverage.query";
import type { Period } from "@/lib/dates/utils/period.util";
export async function getCashFlow(userId: string, period: Period) {
  const groups = await prisma.financialTransaction.groupBy({
    by: ["currency", "type", "inflowKind", "expenseCategoryId"],
    where: {
      userId,
      occurredAt: {
        gte: period.start.toUTC().toJSDate(),
        lt: period.end.toUTC().toJSDate(),
      },
    },
    _sum: { amountMinor: true },
  });
  const totals = new Map<
    string,
    {
      income: bigint;
      expense: bigint;
      transfer: bigint;
      earnedWork: bigint;
      businessRevenue: bigint;
      refunds: bigint;
      netSpending: bigint;
    }
  >();
  for (const group of groups) {
    const total = totals.get(group.currency) ?? {
      income: 0n,
      expense: 0n,
      transfer: 0n,
      earnedWork: 0n,
      businessRevenue: 0n,
      refunds: 0n,
      netSpending: 0n,
    };
    const amount = group._sum.amountMinor ?? 0n;
    total[
      group.type === "INCOME"
        ? "income"
        : group.type === "EXPENSE"
          ? "expense"
          : "transfer"
    ] += amount;
    if (group.inflowKind === "EARNED_WORK") total.earnedWork += amount;
    if (group.inflowKind === "BUSINESS_REVENUE")
      total.businessRevenue += amount;
    if (group.type === "INCOME" && group.inflowKind === "REFUND")
      total.refunds += amount;
    totals.set(group.currency, total);
  }
  for (const total of totals.values())
    total.netSpending = total.expense - total.refunds;
  const coverage = await getFinanceCoverage(userId, {
    start: period.start.toUTC().toJSDate(),
    end: period.end.toUTC().toJSDate(),
  });
  return { totals, groups, coverage };
}
