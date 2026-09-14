import {
  audienceName,
  audienceInclude,
} from "@/features/entrepreneurship/audiences/utils/audience.util";
import { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  getPeriod,
  getPreviousPeriod,
  type Timeframe,
} from "@/lib/dates/utils/period.util";
import { getConfirmedBusinessReceipts } from "@/features/finance/business-receipts/queries/business-receipt.query";
import {
  evidenceInclude,
  evidenceCondition,
} from "@/features/entrepreneurship/problems/queries/problem.query";

export async function getBusinessAttention(userId: string) {
  const today = DateTime.now().setZone(APP_TIMEZONE).toISODate()!;
  const [due, changed, receipts, accepted] = await Promise.all([
    prisma.followUp.findMany({
      where: {
        userId,
        completedAt: null,
        cancelledAt: null,
        dueOn: { lte: new Date(today) },
      },
      orderBy: [{ dueOn: "asc" }, { id: "asc" }],
      take: 20,
    }),
    prisma.problemEvidence.findMany({
      where: { userId, withdrawnAt: null },
      include: { ...evidenceInclude, problem: { select: { title: true } } },
    }),
    prisma.businessReceiptAllocation.findMany({
      where: {
        userId,
        withdrawnAt: null,
        needsReviewAt: { not: null },
        transactionId: { not: null },
      },
      take: 10,
      orderBy: { needsReviewAt: "asc" },
    }),
    prisma.offerEngagement.findMany({
      where: {
        userId,
        continuationChoice: null,
        offer: { archivedAt: null },
        events: { some: { kind: "ACCEPTED", retractedAt: null } },
      },
      include: {
        offer: { select: { mode: true } },
        events: {
          where: { retractedAt: null },
          orderBy: [
            { occurredAt: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 1,
        },
      },
      take: 10,
    }),
  ]);
  const items = due.map((item) => ({
    id: item.id,
    text: `${item.dueOn!.toISOString().slice(0, 10) < today ? "Overdue" : "Due today"}: ${item.title}`,
    href: item.companyId
      ? `/entrepreneurship/market/companies/${item.companyId}`
      : item.interactionId
        ? `/entrepreneurship/interactions/${item.interactionId}`
        : `/entrepreneurship/offers/${item.offerId}`,
  }));
  for (const item of changed.filter(
    (record) => evidenceCondition(record) !== "CURRENT",
  ))
    if (!items.some((existing) => existing.id === `problem-${item.problemId}`))
      items.push({
        id: `problem-${item.problemId}`,
        text: `Review changed evidence: ${item.problem.title}`,
        href: `/entrepreneurship/problems/${item.problemId}`,
      });
  for (const item of receipts)
    items.push({
      id: item.id,
      text: `Review receipt attribution: ${audienceName(item)}`,
      href: `/finance/transactions/${item.transactionId}`,
    });
  for (const item of accepted.filter(
    (offer) => offer.events[0]?.kind === "ACCEPTED",
  ))
    items.push({
      id: item.offer.mode === "SPECIFIC" ? item.offerId : item.id,
      text: `Choose the work continuation for ${audienceName(item)}`,
      href: `/entrepreneurship/offers/${item.offerId}`,
    });
  return items;
}
async function periodFacts(userId: string, start: Date, end: Date) {
  const [interactions, time, companiesAdded, offersProposed, receipts] =
    await Promise.all([
      prisma.$queryRaw<
        { kind: string; count: number; companies: number }[]
      >`SELECT r.kind, COUNT(*)::int AS count, COUNT(DISTINCT r."companyId")::int AS companies FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."occurredAt">=${start} AND r."occurredAt"<${end} GROUP BY r.kind`,
      prisma.$queryRaw<
        { kind: string; seconds: number }[]
      >`SELECT COALESCE(s."entrepreneurshipActivityKind",'UNKNOWN') AS kind, SUM(${sessionFocusedSecondsSql("s", { start, end })})::float8 AS seconds FROM session s JOIN domain d ON d.id=s."domainId" WHERE s."userId"=${userId} AND d.slug='entrepreneurship' AND s."startedAt"<${end} AND (s."endedAt" IS NULL OR s."endedAt">${start}) GROUP BY s."entrepreneurshipActivityKind"`,
      prisma.company.count({
        where: { userId, createdAt: { gte: start, lt: end } },
      }),
      prisma.$queryRaw<
        { count: number }[]
      >`SELECT COUNT(DISTINCT "offerId")::int AS count FROM offer_event WHERE "userId"=${userId} AND kind='PROPOSED' AND "retractedAt" IS NULL AND "occurredAt">=${start} AND "occurredAt"<${end}`,
      getConfirmedBusinessReceipts(userId, start, end),
    ]);
  return {
    audience: await getAudienceMetrics(userId, { start, end }),
    interactions,
    time,
    companiesAdded,
    offersProposed: offersProposed[0].count,
    receipts,
  };
}
export async function getBusinessOverview(
  userId: string,
  timeframe: Timeframe,
  reference: DateTime,
) {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const period = getPeriod(reference, timeframe);
  const previous = getPreviousPeriod(period);
  const [facts, previousFacts, niches, voice, nextActions, attention] =
    await Promise.all([
      periodFacts(
        userId,
        period.start.toJSDate(),
        DateTime.min(period.end, now).toJSDate(),
      ),
      periodFacts(userId, previous.start.toJSDate(), previous.end.toJSDate()),
      prisma.niche.findMany({
        where: {
          userId,
          archivedAt: null,
          direction: { in: ["EXPLORING", "PURSUING"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: { _count: { select: { companies: true } } },
      }),
      prisma.$queryRaw<
        {
          id: string;
          statement: string;
          wordingMode: string;
          companySnapshot: string | null;
          observedAt: Date;
          interactionId: string | null;
        }[]
      >`SELECT o.id, r.statement,r."wordingMode",r."companySnapshot",r."observedAt",r."interactionId" FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r.version=o.version WHERE o."userId"=${userId} AND o."voidedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM interaction si WHERE si.id=r."interactionId" AND si."voidedAt" IS NOT NULL) AND r."observedAt">=${period.start.toJSDate()} AND r."observedAt"<${DateTime.min(period.end, now).toJSDate()} ORDER BY r."observedAt" DESC,o.id DESC LIMIT 3`,
      prisma.followUp.findMany({
        where: {
          userId,
          completedAt: null,
          cancelledAt: null,
          dueOn: { not: null },
        },
        orderBy: [{ dueOn: "asc" }, { id: "asc" }],
        take: 3,
      }),
      getBusinessAttention(userId),
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
    period,
    previous,
    toDate: now < period.end,
    facts,
    previousFacts,
    niches,
    voice: voice.map((v) => ({
      ...v,
      ...voiceSources.find((o) => o.id === v.id)?.revisions[0],
      id: v.id,
    })),
    nextActions,
    attention,
  };
}
