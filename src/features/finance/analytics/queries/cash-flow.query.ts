import { prisma } from "@/lib/db/adapters/prisma.adapter";
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
    }
  >();
  for (const group of groups) {
    const total = totals.get(group.currency) ?? {
      income: 0n,
      expense: 0n,
      transfer: 0n,
      earnedWork: 0n,
      businessRevenue: 0n,
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
    totals.set(group.currency, total);
  }
  return { totals, groups };
}
