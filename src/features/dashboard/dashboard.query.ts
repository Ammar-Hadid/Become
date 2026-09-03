import { DateTime } from "luxon";
import type { DashboardData } from "@/features/dashboard/dashboard.types";
import { prisma } from "@/lib/db/prisma.adapter";
import {
  calculateSessionDurationWithinPeriod,
  getPeriod,
  getPreviousPeriod,
  percentageChange,
  type Timeframe,
} from "@/lib/dates/period.util";

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

function getChartBuckets(timeframe: Timeframe, periodStart: DateTime) {
  if (timeframe === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const start = periodStart.plus({ days: index });
      return {
        start,
        end: start.plus({ days: 1 }),
        label: start.toFormat("ccc"),
      };
    });
  }
  if (timeframe === "month") {
    const buckets = [];
    let start = periodStart;
    const periodEnd = periodStart.plus({ months: 1 });
    let index = 1;
    while (start < periodEnd) {
      const end = DateTime.min(start.plus({ weeks: 1 }), periodEnd);
      buckets.push({ start, end, label: `W${index++}` });
      start = end;
    }
    return buckets;
  }
  const months = timeframe === "season" ? 3 : 12;
  return Array.from({ length: months }, (_, index) => {
    const start = periodStart.plus({ months: index });
    return {
      start,
      end: start.plus({ months: 1 }),
      label: start.toFormat("LLL"),
    };
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
  const activeDays = new Set(
    sessions
      .filter(
        (session) =>
          calculateSessionDurationWithinPeriod(session, period, now) > 0,
      )
      .map((session) =>
        DateTime.fromJSDate(session.startedAt).setZone(now.zone).toISODate(),
      ),
  ).size;

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
    chart: getChartBuckets(timeframe, period.start).map((bucket) => ({
      label: bucket.label,
      seconds: sessions.reduce(
        (total, session) =>
          total + calculateSessionDurationWithinPeriod(session, bucket, now),
        0,
      ),
    })),
  };
}
