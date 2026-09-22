import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { getInteractionDetail } from "@/features/entrepreneurship/interactions/queries/interaction.query";

const reachKinds = [
  "OUTREACH_SENT",
  "REPLY_RECEIVED",
  "ATTEMPT_NO_CONTACT",
] as const;

export async function getReachActivityDetail(
  userId: string,
  nicheId: string,
  interactionId: string,
) {
  const activity = await getInteractionDetail(userId, interactionId);
  const current = activity?.revisions[0];
  if (
    !activity ||
    current?.nicheId !== nicheId ||
    !reachKinds.includes(current.kind as (typeof reachKinds)[number])
  )
    return null;
  return activity;
}

export async function getReachWorkspace(userId: string, nicheId: string) {
  const [niche, people, companies, segments, activityIds, followUpIds] =
    await Promise.all([
      prisma.niche.findFirst({
        where: { id: nicheId, userId },
        select: { id: true, name: true, archivedAt: true },
      }),
      prisma.person.findMany({
        where: {
          userId,
          archivedAt: null,
          niches: { some: { nicheId } },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, updatedAt: true },
      }),
      prisma.company.findMany({
        where: {
          userId,
          archivedAt: null,
          niches: { some: { nicheId } },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, website: true, updatedAt: true },
      }),
      prisma.audienceSegment.findMany({
        where: {
          userId,
          archivedAt: null,
          niches: { some: { nicheId } },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          marketType: true,
        },
      }),
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT i.id
        FROM interaction i
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE i."userId" = ${userId}
          AND i."voidedAt" IS NULL
          AND r."nicheId" = ${nicheId}
          AND r.kind IN ('OUTREACH_SENT', 'REPLY_RECEIVED', 'ATTEMPT_NO_CONTACT')
        ORDER BY r."occurredAt" DESC, i.id DESC
        LIMIT 250
      `),
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT f.id
        FROM follow_up f
        JOIN interaction i
          ON i.id = f."interactionId" AND i."userId" = f."userId"
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE f."userId" = ${userId}
          AND f."completedAt" IS NULL
          AND f."cancelledAt" IS NULL
          AND r."nicheId" = ${nicheId}
        ORDER BY f."dueOn" ASC NULLS LAST, f."createdAt" ASC, f.id ASC
      `),
    ]);
  if (!niche) return null;

  const ids = activityIds.map((row) => row.id);
  const [activityRecords, followUps, conversationBridges] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId, id: { in: ids } },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { audienceContext: audienceInclude },
        },
        followUps: { orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }] },
      },
    }),
    prisma.followUp.findMany({
      where: { userId, id: { in: followUpIds.map((row) => row.id) } },
      include: {
        interaction: {
          include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    }),
    prisma.$queryRaw<
      { sourceId: string; conversationId: string; status: string }[]
    >(Prisma.sql`
      SELECT r."respondsToInteractionId" AS "sourceId", i.id AS "conversationId", i.status
      FROM interaction i
      JOIN interaction_revision r
        ON r."interactionId" = i.id AND r.version = i.version
      WHERE i."userId" = ${userId}
        AND i."voidedAt" IS NULL
        AND r."nicheId" = ${nicheId}
        AND r.kind = 'CONVERSATION'
        AND r."respondsToInteractionId" IS NOT NULL
    `),
  ]);

  const activity = ids.flatMap((id) => {
    const record = activityRecords.find((candidate) => candidate.id === id);
    if (!record || !reachKinds.includes(record.revisions[0]?.kind as never))
      return [];
    return [
      {
        ...record,
        conversation:
          conversationBridges.find((bridge) => bridge.sourceId === id) ?? null,
      },
    ];
  });
  const latestByIdentity = new Map<string, (typeof activity)[number]>();
  for (const record of activity) {
    const revision = record.revisions[0];
    const identity = revision.personId
      ? `person:${revision.personId}`
      : revision.companyId
        ? `company:${revision.companyId}`
        : null;
    if (identity && !latestByIdentity.has(identity))
      latestByIdentity.set(identity, record);
  }

  return {
    niche,
    targets: {
      people: people.map((person) => ({
        ...person,
        latestActivity: latestByIdentity.get(`person:${person.id}`) ?? null,
      })),
      companies: companies.map((company) => ({
        ...company,
        latestActivity: latestByIdentity.get(`company:${company.id}`) ?? null,
      })),
      segments,
    },
    followUps: followUpIds.flatMap((row) => {
      const followUp = followUps.find((candidate) => candidate.id === row.id);
      return followUp ? [followUp] : [];
    }),
    activity,
  };
}
