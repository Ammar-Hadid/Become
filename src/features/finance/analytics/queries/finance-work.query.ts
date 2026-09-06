import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  calculateSessionDurationWithinPeriod,
  type Period,
} from "@/lib/dates/utils/period.util";
import { effectiveHourlyRate } from "@/features/finance/analytics/utils/effective-rate.util";
export async function getFinanceWork(
  userId: string,
  period: Period,
  now: DateTime,
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      domain: { slug: "finance" },
      startedAt: { lt: period.end.toUTC().toJSDate() },
      OR: [
        { endedAt: null },
        { endedAt: { gt: period.start.toUTC().toJSDate() } },
      ],
    },
    include: {
      paymentAllocations: {
        include: { transaction: { select: { currency: true } } },
      },
    },
  });
  const seconds: Record<string, number> = {
    PAID_WORK: 0,
    OPPORTUNITY_SEARCH: 0,
    APPLICATION: 0,
    ASSESSMENT: 0,
    FINANCE_ADMIN: 0,
    UNCLASSIFIED: 0,
  };
  for (const session of sessions)
    seconds[session.financeActivityKind ?? "UNCLASSIFIED"] +=
      calculateSessionDurationWithinPeriod(session, period, now);
  const rate = effectiveHourlyRate(
    sessions.filter((session) => session.financeActivityKind === "PAID_WORK"),
    period,
    now,
  );
  const between = {
    gte: period.start.toUTC().toJSDate(),
    lt: period.end.toUTC().toJSDate(),
  };
  const [
    cohort,
    applications,
    assessments,
    sourceIncome,
    channelIncome,
    opportunityIncome,
  ] = await Promise.all([
    prisma.incomeOpportunity.findMany({
      where: { userId, discoveredAt: between },
      include: {
        transactions: {
          where: {
            type: "INCOME",
            occurredAt: {
              lte: DateTime.min(now, period.end).toUTC().toJSDate(),
            },
          },
          select: { id: true },
        },
      },
    }),
    prisma.incomeOpportunity.count({ where: { userId, appliedAt: between } }),
    prisma.incomeOpportunity.count({
      where: { userId, assessmentAt: between },
    }),
    prisma.financialTransaction.groupBy({
      by: ["currency", "workSourceId"],
      where: {
        userId,
        type: "INCOME",
        inflowKind: "EARNED_WORK",
        occurredAt: between,
      },
      _sum: { amountMinor: true },
    }),
    prisma.$queryRaw<
      { channel: string | null; currency: string; amountMinor: string }[]
    >`
        SELECT o.channel, t.currency, SUM(t."amountMinor")::text AS "amountMinor"
        FROM financial_transaction t
        JOIN income_opportunity o ON o.id = t."incomeOpportunityId" AND o."userId" = t."userId"
        WHERE t."userId" = ${userId} AND t.type = 'INCOME'
          AND t."occurredAt" >= ${between.gte} AND t."occurredAt" < ${between.lt}
        GROUP BY o.channel, t.currency ORDER BY t.currency, o.channel`,
    prisma.financialTransaction.groupBy({
      by: ["currency", "incomeOpportunityId"],
      where: {
        userId,
        type: "INCOME",
        incomeOpportunityId: { not: null },
        occurredAt: between,
      },
      _sum: { amountMinor: true },
    }),
  ]);
  return {
    seconds,
    incomeDevelopment:
      seconds.OPPORTUNITY_SEARCH + seconds.APPLICATION + seconds.ASSESSMENT,
    rate,
    cohort: {
      discovered: cohort.length,
      accepted: cohort.filter((o) => o.status === "ACCEPTED").length,
      rejected: cohort.filter((o) => o.status === "REJECTED").length,
      abandoned: cohort.filter((o) => o.status === "ABANDONED").length,
      paid: cohort.filter((o) => o.transactions.length > 0).length,
    },
    applications,
    assessments,
    sourceIncome,
    opportunityIncome,
    channelIncome,
  };
}
