import { DateTime } from "luxon";
import { toSessionListItem } from "@/features/sessions/session.mapper";
import { prisma } from "@/lib/db/prisma.adapter";

export async function getAppSessionData(userId: string, now = DateTime.utc()) {
  const [domains, activeSession] = await Promise.all([
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
    prisma.session.findFirst({
      where: { userId, endedAt: null },
      include: { domain: true, activityType: true },
    }),
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
      })),
    })),
    activeSession: activeSession ? toSessionListItem(activeSession, now) : null,
  };
}

export async function getRecentSessions(
  userId: string,
  take = 12,
  domainId?: string,
) {
  const sessions = await prisma.session.findMany({
    where: { userId, ...(domainId ? { domainId } : {}) },
    include: { domain: true, activityType: true },
    orderBy: { startedAt: "desc" },
    take,
  });

  return sessions.map((session) => toSessionListItem(session));
}

export async function getCompletedSessionById(userId: string, id: string) {
  const session = await prisma.session.findFirst({
    where: { id, userId, endedAt: { not: null } },
    include: { domain: true, activityType: true },
  });

  return session ? toSessionListItem(session) : null;
}
