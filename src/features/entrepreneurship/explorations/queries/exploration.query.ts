import { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { timerSessionInclude } from "@/features/sessions/timer/queries/timer-snapshot.query";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  companyExplorationWhere,
  problemExplorationWhere,
  offerExplorationWhere,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";

export function getExplorationShell(userId: string, id: string) {
  return prisma.niche.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      scope: true,
      direction: true,
      archivedAt: true,
      updatedAt: true,
      marketFocus: true,
      marketConclusion: true,
    },
  });
}

export async function getExploration(userId: string, id: string) {
  const exploration = await prisma.niche.findFirst({
    where: { id, userId },
    include: {
      decisions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
    },
  });
  if (!exploration) return null;
  const journal = await getEvidenceJournal(userId, { nicheId: id });
  const sourceOptions = journal.entries.flatMap((e) => [
    { id: `${e.type}:${e.revisionId}`, name: e.title.slice(0, 160) },
    ...e.observations.map((o) => ({
      id: `OBSERVATION:${o.revisionId}`,
      name: o.statement.slice(0, 160),
    })),
  ]);
  const outcomes = await prisma.offerEvent.findMany({
    where: {
      userId,
      retractedAt: null,
      offer: { niches: { some: { nicheId: id } } },
    },
    orderBy: { occurredAt: "desc" },
    take: 25,
    include: { revision: { select: { title: true } } },
  });
  sourceOptions.push(
    ...outcomes.map((e) => ({
      id: `OFFER_EVENT:${e.id}`,
      name: `${e.kind} · ${e.revision.title}`,
    })),
  );
  const captured = exploration.decisions[0]?.sourceSnapshots;
  const initialSourceKeys: string[] = [];
  if (Array.isArray(captured))
    for (const source of captured) {
      if (
        !source ||
        typeof source !== "object" ||
        Array.isArray(source) ||
        typeof source.key !== "string"
      )
        continue;
      initialSourceKeys.push(source.key);
      if (!sourceOptions.some((o) => o.id === source.key))
        sourceOptions.push({
          id: source.key,
          name: `Previously captured · ${String(source.label ?? "Source").slice(0, 160)}`,
        });
    }
  return { ...exploration, sourceOptions, initialSourceKeys };
}

/** Heavy direction-authoring data, intentionally kept off the shell's critical path. */
export function getExplorationDirectionEditor(userId: string, id: string) {
  return getExploration(userId, id);
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
    >`SELECT COALESCE(SUM(${sessionFocusedSecondsSql("session")}), 0)::float8 AS seconds, COUNT(*)::int AS sessions FROM session WHERE "userId"=${userId} AND "businessNicheId"=${nicheId}`,
  ]);
  const [audience, segments, people] = await Promise.all([
    getAudienceMetrics(userId, { nicheId }),
    prisma.audienceSegment.count({
      where: { userId, archivedAt: null, niches: { some: { nicheId } } },
    }),
    prisma.person.count({
      where: { userId, archivedAt: null, niches: { some: { nicheId } } },
    }),
  ]);
  return {
    companies,
    problems,
    offers,
    ...events[0],
    ...time[0],
    ...audience,
    segments,
    people,
  };
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
      include: timerSessionInclude,
    }),
  ]);
  const nextActions = await prisma.followUp.findMany({
    where: { userId, id: { in: followUps.map((f) => f.id) } },
    orderBy: [{ dueOn: "asc" }, { id: "asc" }],
  });
  const [recentJournal, audienceSegments, recentProblems, recentOffers] =
    await Promise.all([
      getEvidenceJournal(userId, { nicheId }),
      prisma.audienceSegment.findMany({
        where: { userId, archivedAt: null, niches: { some: { nicheId } } },
        select: { id: true, name: true, description: true, marketType: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
      prisma.problem.findMany({
        where: {
          userId,
          archivedAt: null,
          ...problemExplorationWhere(nicheId),
        },
        orderBy: [{ formulatedAt: "desc" }, { id: "desc" }],
        take: 3,
        include: {
          audienceContext: audienceInclude,
          assessments: {
            orderBy: [{ assessedAt: "desc" }, { id: "desc" }],
            take: 1,
          },
        },
      }),
      prisma.offer.findMany({
        where: { userId, archivedAt: null, ...offerExplorationWhere(nicheId) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        include: {
          audienceContext: audienceInclude,
          revisions: { orderBy: { version: "desc" }, take: 1 },
        },
      }),
    ]);
  const voiceSources = await prisma.observation.findMany({
    where: { userId, id: { in: voice.map((v) => v.id) } },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { audienceContext: audienceInclude },
      },
    },
  });
  return {
    recentEvidence: recentJournal.entries.slice(0, 5),
    audienceSegments,
    investigateProblems: recentProblems.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.assessments[0]?.state ?? "INVESTIGATING",
      audienceContext: p.audienceContext,
    })),
    testedOffers: recentOffers.map((o) => ({
      id: o.id,
      title: o.revisions[0]?.title ?? "Offer draft",
      mode: o.mode,
      audienceContext: o.audienceContext,
    })),
    voice: voice.map((v) => ({
      ...v,
      ...voiceSources.find((o) => o.id === v.id)?.revisions[0],
      id: v.id,
    })),
    nextActions,
    sessions: sessions.map((session) => toSessionListItem(session)),
  };
}
