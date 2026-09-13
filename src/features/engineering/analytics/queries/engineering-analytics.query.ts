import { DateTime } from "luxon";
import { buildEngineeringAnalytics } from "@/features/engineering/analytics/utils/engineering-analytics.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  getPeriod,
  getPreviousPeriod,
  type Timeframe,
} from "@/lib/dates/utils/period.util";

export async function getEngineeringAnalyticsData(
  userId: string,
  timeframe: Timeframe,
  now: DateTime,
) {
  const period = getPeriod(now, timeframe);
  const previousPeriod = getPreviousPeriod(period);
  const domain = await prisma.domain.findFirst({
    where: { userId, slug: "engineering" },
    select: { id: true },
  });
  if (!domain) return buildEngineeringAnalytics([], [], timeframe, now);

  const rangeStart = previousPeriod.start.toUTC().toJSDate();
  const rangeEnd = period.end.toUTC().toJSDate();
  const [sessions, evidence] = await Promise.all([
    prisma.session.findMany({
      where: {
        userId,
        domainId: domain.id,
        startedAt: { lt: rangeEnd },
        OR: [{ endedAt: null }, { endedAt: { gt: rangeStart } }],
      },
      select: {
        pauses: true,
        startedAt: true,
        endedAt: true,
        engineeringContext: true,
        activityType: { select: { id: true, name: true } },
        engineeringProject: {
          select: {
            id: true,
            name: true,
            context: true,
            technologies: {
              select: {
                technology: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.engineeringEvidence.findMany({
      where: {
        userId,
        occurredAt: { gte: rangeStart, lt: rangeEnd },
      },
      select: { type: true, occurredAt: true },
    }),
  ]);

  return buildEngineeringAnalytics(sessions, evidence, timeframe, now);
}
