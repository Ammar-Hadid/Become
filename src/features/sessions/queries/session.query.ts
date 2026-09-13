import { getTimerSnapshot } from "@/features/sessions/timer/queries/timer-snapshot.query";
import { DateTime } from "luxon";
import {
  toSessionDetailItem,
  toSessionListItem,
} from "@/features/sessions/mappers/session.mapper";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function getAppSessionData(userId: string, now = DateTime.utc()) {
  const [domains, timerSnapshot] = await Promise.all([
    prisma.domain.findMany({
      where: { userId, enabled: true },
      include: {
        activityTypes: {
          where: { enabled: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    getTimerSnapshot(userId, now),
  ]);

  return {
    domains: domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      slug: domain.slug,
      icon: domain.icon,
      analyticsColor: domain.analyticsColor,
      activityTypes: domain.activityTypes.map((activity) => ({
        id: activity.id,
        name: activity.name,
        slug: activity.slug,
        financeActivityKind: activity.financeActivityKind,
      })),
    })),
    activeSession: timerSnapshot.activeSession,
    timerSnapshot,
  };
}

export async function getRecentSessions(
  userId: string,
  take = 12,
  domainId?: string,
) {
  const sessions = await prisma.session.findMany({
    where: { userId, ...(domainId ? { domainId } : {}) },
    include: {
      domain: true,
      activityType: true,
      engineeringProject: true,
      pauses: true,
    },
    orderBy: { startedAt: "desc" },
    take,
  });

  return sessions.map((session) => toSessionListItem(session));
}

export async function getCompletedSessionById(userId: string, id: string) {
  const session = await prisma.session.findFirst({
    where: { id, userId, endedAt: { not: null } },
    include: {
      domain: true,
      activityType: true,
      engineeringProject: true,
      pauses: true,
      engineeringEvidence: { orderBy: { occurredAt: "desc" } },
    },
  });

  return session ? toSessionDetailItem(session) : null;
}
