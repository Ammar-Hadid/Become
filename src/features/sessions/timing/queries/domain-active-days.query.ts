import type { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Period } from "@/lib/dates/utils/period.util";
import { countActiveDaysWithinPeriod } from "@/features/sessions/timing/utils/session-duration.util";

export async function getDomainActiveDays(
  userId: string,
  domainSlug: string,
  period: Pick<Period, "start" | "end">,
  now: DateTime,
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      domain: { slug: domainSlug },
      startedAt: { lt: period.end.toJSDate() },
      OR: [{ endedAt: null }, { endedAt: { gt: period.start.toJSDate() } }],
    },
    select: {
      startedAt: true,
      endedAt: true,
      pauses: { select: { startedAt: true, endedAt: true } },
    },
  });
  return countActiveDaysWithinPeriod(sessions, period, now);
}
