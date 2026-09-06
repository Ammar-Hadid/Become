import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { formatMoney } from "@/lib/money/utils/money.util";
export type FinanceAttention = {
  id: string;
  priority: number;
  text: string;
  href: string;
};
export async function getFinanceAttention(userId: string) {
  const [savings, position, occurrences, payments, sessions, accepted] =
    await Promise.all([
      getSavings(userId),
      getFinancialPosition(userId),
      prisma.recurringExpenseOccurrence.findMany({
        where: { userId, status: "AWAITING_CONFIRMATION" },
        orderBy: [{ dueOn: "asc" }, { id: "asc" }],
        take: 10,
      }),
      prisma.$queryRaw<
        { id: string; currency: string; remainder: string }[]
      >`SELECT t.id, t.currency, (t."amountMinor" - COALESCE(SUM(a."amountMinor"),0))::text AS remainder FROM financial_transaction t LEFT JOIN payment_session_allocation a ON a."transactionId" = t.id AND a."userId" = t."userId" WHERE t."userId" = ${userId} AND t.type = 'INCOME' AND t."inflowKind" = 'EARNED_WORK' GROUP BY t.id HAVING t."amountMinor" > COALESCE(SUM(a."amountMinor"),0) ORDER BY t."occurredAt" DESC, t.id DESC LIMIT 10`,
      prisma.session.findMany({
        where: {
          userId,
          financeActivityKind: "PAID_WORK",
          endedAt: { not: null },
          paymentAttributionCompleteAt: null,
        },
        select: { id: true, description: true },
        orderBy: [{ startedAt: "desc" }, { id: "asc" }],
        take: 10,
      }),
      prisma.incomeOpportunity.findMany({
        where: {
          userId,
          status: "ACCEPTED",
          archivedAt: null,
          resultingWorkSourceId: null,
        },
        select: { id: true, title: true },
        orderBy: { id: "asc" },
        take: 10,
      }),
    ]);
  const items: FinanceAttention[] = [];
  for (const account of position) {
    if (account.balanceMinor === null)
      items.push({
        id: `account-${account.id}`,
        priority: 1,
        text: `${account.name}: position unavailable; reconcile the account.`,
        href: `/finance/accounts/${account.id}`,
      });
    else if (
      account.reconciledAt &&
      Date.now() - account.reconciledAt.getTime() > 30 * 86400000
    )
      items.push({
        id: `stale-${account.id}`,
        priority: 4,
        text: `${account.name}: reconciliation is over 30 days old.`,
        href: `/finance/accounts/${account.id}`,
      });
  }
  for (const pool of savings.pools) {
    if (pool.underfunding !== null && pool.underfunding > 0n)
      items.push({
        id: `underfunded-${pool.currency}`,
        priority: 1,
        text: `Savings plan underfunded by ${formatMoney(pool.underfunding, pool.currency)}. Rebalance allocations.`,
        href: "/finance/savings",
      });
    if (pool.reserveShortfall !== null && pool.reserveShortfall > 0n)
      items.push({
        id: `reserve-${pool.currency}`,
        priority: 1,
        text: `Protected reserve shortfall: ${formatMoney(pool.reserveShortfall, pool.currency)}.`,
        href: "/finance/savings",
      });
  }
  for (const goal of savings.goals.filter(
    (goal) => !goal.archivedAt && goal.funding.overAllocated > 0n,
  ))
    items.push({
      id: `goal-${goal.id}`,
      priority: 2,
      text: `${goal.name}: ${formatMoney(goal.funding.overAllocated, goal.currency)} allocated beyond remaining need.`,
      href: `/finance/savings/${goal.id}`,
    });
  for (const goal of savings.goals.filter(
    (goal) => !goal.archivedAt && goal.completionNeedsReviewAt,
  ))
    items.push({
      id: `goal-review-${goal.id}`,
      priority: 2,
      text: `${goal.name}: goal spending was corrected. Review whether the completed objective is still fulfilled.`,
      href: `/finance/savings/${goal.id}`,
    });
  for (const occurrence of occurrences)
    items.push({
      id: occurrence.id,
      priority: 2,
      text: `Confirm ${occurrence.nameSnapshot}, due ${occurrence.dueOn.toISOString().slice(0, 10)}.`,
      href: "/finance/recurring",
    });
  for (const payment of payments)
    items.push({
      id: payment.id,
      priority: 3,
      text: `Earned-work payment has ${formatMoney(payment.remainder, payment.currency)} unallocated.`,
      href: `/finance/transactions/${payment.id}`,
    });
  for (const session of sessions)
    items.push({
      id: session.id,
      priority: 3,
      text: `${session.description || "Paid work"}: payment attribution review needed.`,
      href: `/finance/work/${session.id}`,
    });
  for (const opportunity of accepted)
    items.push({
      id: opportunity.id,
      priority: 4,
      text: `${opportunity.title}: accepted without a work source.`,
      href: `/finance/opportunities/${opportunity.id}`,
    });
  return items.sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  );
}
