import { DateTime } from "luxon";
import type { DashboardData } from "@/features/dashboard/analytics/types/dashboard.types";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  calculateSessionDurationWithinPeriod,
  countActiveDaysWithinPeriod,
  getPeriod,
  getPeriodBuckets,
  getPreviousPeriod,
  percentageChange,
  type Timeframe,
} from "@/lib/dates/utils/period.util";

async function getSessionsForRange(userId: string, start: Date, end: Date) {
  return prisma.session.findMany({
    where: {
      userId,
      startedAt: { lt: end },
      OR: [{ endedAt: null }, { endedAt: { gt: start } }],
    },
    include: { domain: true, activityType: true },
    orderBy: { startedAt: "desc" },
  });
}

export async function getDashboardData(
  userId: string,
  timeframe: Timeframe,
  now: DateTime,
): Promise<DashboardData> {
  const period = getPeriod(now, timeframe);
  const previousPeriod = getPreviousPeriod(period);
  const domains = await prisma.domain.findMany({
    where: { userId, enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  const sessions = await getSessionsForRange(
    userId,
    previousPeriod.start.toUTC().toJSDate(),
    period.end.toUTC().toJSDate(),
  );

  const totalFor = (candidatePeriod: typeof period, domainId?: string) =>
    sessions
      .filter((session) => !domainId || session.domainId === domainId)
      .reduce(
        (total, session) =>
          total +
          calculateSessionDurationWithinPeriod(session, candidatePeriod, now),
        0,
      );

  const totalSeconds = totalFor(period);
  const previousTotalSeconds = totalFor(previousPeriod);
  const today = {
    start: now.startOf("day"),
    end: now.plus({ days: 1 }).startOf("day"),
  };
  const activeDays = countActiveDaysWithinPeriod(sessions, period, now);

  return {
    timeframe,
    periodLabel: period.label,
    totalSeconds,
    previousTotalSeconds,
    comparisonPercent: percentageChange(totalSeconds, previousTotalSeconds),
    todaySeconds: sessions.reduce(
      (total, session) =>
        total + calculateSessionDurationWithinPeriod(session, today, now),
      0,
    ),
    activeDays,
    domains: domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      slug: domain.slug,
      color: domain.analyticsColor ?? "#989BA3",
      seconds: totalFor(period, domain.id),
      previousSeconds: totalFor(previousPeriod, domain.id),
    })),
    chart: getPeriodBuckets(period).map((bucket) => ({
      label: bucket.label,
      seconds: sessions.reduce(
        (total, session) =>
          total + calculateSessionDurationWithinPeriod(session, bucket, now),
        0,
      ),
    })),
  };
}
