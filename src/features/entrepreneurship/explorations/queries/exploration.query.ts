import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  companyExplorationWhere,
  problemExplorationWhere,
  offerExplorationWhere,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";

export function getExploration(userId: string, id: string) {
  return prisma.niche.findFirst({
    where: { id, userId },
    include: {
      decisions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
    },
  });
}
export async function getExplorationSummary(userId: string, nicheId: string) {
  const [companies, problems, offers, events, time] = await Promise.all([
    prisma.company.count({
      where: { userId, archivedAt: null, ...companyExplorationWhere(nicheId) },
    }),
    prisma.problem.count({
      where: { userId, archivedAt: null, ...problemExplorationWhere(nicheId) },
    }),
    prisma.offer.count({
      where: { userId, archivedAt: null, ...offerExplorationWhere(nicheId) },
    }),
    prisma.$queryRaw<
      { interactions: number; contacted: number; conversations: number }[]
    >`SELECT COUNT(*)::int AS interactions, COUNT(DISTINCT r."companyId") FILTER (WHERE r.kind <> 'ATTEMPT_NO_CONTACT')::int AS contacted, COUNT(*) FILTER (WHERE r.kind='CONVERSATION')::int AS conversations FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId}`,
    prisma.$queryRaw<
      { seconds: number; sessions: number }[]
    >`SELECT COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM COALESCE("endedAt", NOW()) - "startedAt"))), 0)::float8 AS seconds, COUNT(*)::int AS sessions FROM session WHERE "userId"=${userId} AND "businessNicheId"=${nicheId}`,
  ]);
  return { companies, problems, offers, ...events[0], ...time[0] };
}
export async function getExplorations(userId: string) {
  const niches = await prisma.niche.findMany({
    where: { userId },
    include: {
      decisions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return Promise.all(
    niches.map(async (niche) => ({
      ...niche,
      summary: await getExplorationSummary(userId, niche.id),
    })),
  );
}
export async function getExplorationSignals(userId: string, nicheId: string) {
  const [voice, followUps, sessions] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        statement: string;
        companySnapshot: string | null;
        wordingMode: string;
      }[]
    >`SELECT o.id, r.statement, r."companySnapshot", r."wordingMode" FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r.version=o.version WHERE o."userId"=${userId} AND o."voidedAt" IS NULL AND r."nicheId"=${nicheId} AND NOT EXISTS (SELECT 1 FROM interaction i WHERE i.id=r."interactionId" AND i."voidedAt" IS NOT NULL) ORDER BY r."observedAt" DESC, o.id DESC LIMIT 3`,
    prisma.$queryRaw<
      { id: string }[]
    >`SELECT f.id FROM follow_up f LEFT JOIN interaction i ON i.id=f."interactionId" LEFT JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE f."userId"=${userId} AND f."completedAt" IS NULL AND f."cancelledAt" IS NULL AND (r."nicheId"=${nicheId} OR EXISTS (SELECT 1 FROM offer_niche n WHERE n."offerId"=f."offerId" AND n."nicheId"=${nicheId})) ORDER BY f."dueOn" ASC NULLS LAST, f.id LIMIT 5`,
    prisma.session.findMany({
      where: { userId, businessNicheId: nicheId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, description: true, startedAt: true, endedAt: true },
    }),
  ]);
  const nextActions = await prisma.followUp.findMany({
    where: { userId, id: { in: followUps.map((f) => f.id) } },
    orderBy: [{ dueOn: "asc" }, { id: "asc" }],
  });
  return { voice, nextActions, sessions };
}
