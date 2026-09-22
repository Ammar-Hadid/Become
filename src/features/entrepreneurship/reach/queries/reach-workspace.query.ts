import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { getInteractionDetail } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import {
  collectionSearch,
  readCollectionCursor,
  writeCollectionCursor,
} from "@/features/entrepreneurship/shared/utils/collection-cursor.util";

const reachKinds = [
  "OUTREACH_SENT",
  "REPLY_RECEIVED",
  "ATTEMPT_NO_CONTACT",
] as const;
type ReachOptions = {
  q?: string;
  cursor?: string;
  kind?: string;
  view?: "activity" | "follow-ups";
};

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
  const bridges = await prisma.$queryRaw<
    { sourceId: string; conversationId: string; status: string }[]
  >(Prisma.sql`
    SELECT r."respondsToInteractionId" AS "sourceId",i.id AS "conversationId",i.status
    FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"
    WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId} AND r.kind='CONVERSATION' AND r."respondsToInteractionId"=${interactionId}
    ORDER BY i."createdAt" DESC,i.id DESC LIMIT 1`);
  return { ...activity, conversation: bridges[0] ?? null };
}

export async function getReachWorkspace(
  userId: string,
  nicheId: string,
  options: ReachOptions = {},
) {
  const cursor = readCollectionCursor(options.cursor);
  const search = collectionSearch(options.q);
  const kind = reachKinds.find((value) => value === options.kind);
  const activityWhere = Prisma.sql`i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId}
    AND r.kind IN ('OUTREACH_SENT','REPLY_RECEIVED','ATTEMPT_NO_CONTACT')
    ${kind ? Prisma.sql`AND r.kind=${kind}` : Prisma.empty}
    ${search ? Prisma.sql`AND concat_ws(' ',r.summary,r."personSnapshot",r."companySnapshot",r."audienceLabel",r.channel) ILIKE ${search}` : Prisma.empty}`;
  const followWhere = Prisma.sql`f."userId"=${userId} AND i."voidedAt" IS NULL AND f."completedAt" IS NULL AND f."cancelledAt" IS NULL
    AND (r."nicheId"=${nicheId}
      OR EXISTS (SELECT 1 FROM offer_niche n WHERE n."userId"=${userId} AND n."offerId"=f."offerId" AND n."nicheId"=${nicheId})
      OR EXISTS (SELECT 1 FROM company_niche n WHERE n."userId"=${userId} AND n."companyId"=f."companyId" AND n."nicheId"=${nicheId}))
    ${search ? Prisma.sql`AND concat_ws(' ',f.title,r.summary,r."personSnapshot",r."companySnapshot",c.name,offer_current.title) ILIKE ${search}` : Prisma.empty}`;
  const join = Prisma.sql`interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"`;
  const followJoin = Prisma.sql`follow_up f
    LEFT JOIN interaction i ON i.id=f."interactionId" AND i."userId"=f."userId"
    LEFT JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"
    LEFT JOIN company c ON c.id=f."companyId" AND c."userId"=f."userId"
    LEFT JOIN LATERAL (SELECT title FROM offer_revision WHERE "offerId"=f."offerId" AND "userId"=f."userId" ORDER BY version DESC LIMIT 1) offer_current ON true`;
  const [
    niche,
    people,
    companies,
    segments,
    activityRows,
    followRows,
    activityCount,
    followCount,
  ] = await Promise.all([
    prisma.niche.findFirst({
      where: { id: nicheId, userId },
      select: { id: true, name: true, archivedAt: true },
    }),
    prisma.person.findMany({
      where: {
        userId,
        archivedAt: null,
        niches: { some: { nicheId } },
        ...(options.q
          ? {
              name: {
                contains: options.q.trim().slice(0, 200),
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 25,
      select: { id: true, name: true, email: true, updatedAt: true },
    }),
    prisma.company.findMany({
      where: {
        userId,
        archivedAt: null,
        niches: { some: { nicheId } },
        ...(options.q
          ? {
              name: {
                contains: options.q.trim().slice(0, 200),
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 25,
      select: { id: true, name: true, website: true, updatedAt: true },
    }),
    prisma.audienceSegment.findMany({
      where: { userId, archivedAt: null, niches: { some: { nicheId } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 25,
      select: { id: true, name: true, description: true, marketType: true },
    }),
    prisma.$queryRaw<
      { id: string; date: Date }[]
    >(Prisma.sql`SELECT i.id,r."occurredAt" AS date FROM ${join} WHERE ${activityWhere}
      ${cursor && options.view !== "follow-ups" ? Prisma.sql`AND (r."occurredAt",i.id)<(${cursor.date},${cursor.id})` : Prisma.empty}
      ORDER BY r."occurredAt" DESC,i.id DESC LIMIT 26`),
    prisma.$queryRaw<
      { id: string; date: Date }[]
    >(Prisma.sql`SELECT f.id,COALESCE(f."dueOn",TIMESTAMP '9999-01-01') AS date FROM ${followJoin} WHERE ${followWhere}
      ${cursor && options.view === "follow-ups" ? Prisma.sql`AND (COALESCE(f."dueOn",TIMESTAMP '9999-01-01'),f.id)>(${cursor.date},${cursor.id})` : Prisma.empty}
      ORDER BY COALESCE(f."dueOn",TIMESTAMP '9999-01-01') ASC,f.id ASC LIMIT 26`),
    prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM ${join} WHERE ${activityWhere}`,
    ),
    prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM ${followJoin} WHERE ${followWhere}`,
    ),
  ]);
  if (!niche) return null;
  const targetIds = [
    ...people.map((item) => item.id),
    ...companies.map((item) => item.id),
  ];
  // Latest contact is a historical fact: it must not depend on the visible activity page.
  const latest = targetIds.length
    ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT DISTINCT ON (COALESCE(r."personId",r."companyId")) i.id
    FROM ${join} WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId}
      AND r.kind IN ('OUTREACH_SENT','REPLY_RECEIVED','ATTEMPT_NO_CONTACT')
      AND COALESCE(r."personId",r."companyId") IN (${Prisma.join(targetIds)})
    ORDER BY COALESCE(r."personId",r."companyId"),r."occurredAt" DESC,i.id DESC`)
    : [];
  const page = activityRows.slice(0, 25);
  const ids = [
    ...new Set([...page.map((row) => row.id), ...latest.map((row) => row.id)]),
  ];
  const followPage = followRows.slice(0, 25);
  const [records, followUps, bridges] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId, id: { in: ids } },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { audienceContext: audienceInclude },
        },
        followUps: {
          where: { completedAt: null, cancelledAt: null },
          orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }],
          take: 25,
        },
      },
    }),
    prisma.followUp.findMany({
      where: { userId, id: { in: followPage.map((row) => row.id) } },
      include: {
        company: { select: { id: true, name: true } },
        offer: {
          select: {
            id: true,
            revisions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { title: true },
            },
          },
        },
        interaction: {
          include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    }),
    ids.length
      ? prisma.$queryRaw<
          { sourceId: string; conversationId: string; status: string }[]
        >(Prisma.sql`
      SELECT r."respondsToInteractionId" AS "sourceId",i.id AS "conversationId",i.status FROM ${join}
      WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId} AND r.kind='CONVERSATION' AND r."respondsToInteractionId" IN (${Prisma.join(ids)}) ORDER BY i."createdAt" DESC,i.id DESC`)
      : Promise.resolve([]),
  ]);
  const byId = new Map(
    records.map((record) => [
      record.id,
      {
        ...record,
        conversation:
          bridges.find((bridge) => bridge.sourceId === record.id) ?? null,
      },
    ]),
  );
  const latestByIdentity = new Map<
    string,
    NonNullable<ReturnType<typeof byId.get>>
  >();
  for (const row of latest) {
    const record = byId.get(row.id);
    if (!record) continue;
    const revision = record.revisions[0];
    const key = revision.personId
      ? `person:${revision.personId}`
      : `company:${revision.companyId}`;
    latestByIdentity.set(key, record);
  }
  const followById = new Map(followUps.map((item) => [item.id, item]));
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
    activity: page.flatMap((row) => {
      const record = byId.get(row.id);
      return record ? [record] : [];
    }),
    next: activityRows.length > 25 ? writeCollectionCursor(page[24]) : null,
    total: activityCount[0]?.total ?? 0,
    followUps: followPage.flatMap((row) => {
      const item = followById.get(row.id);
      return item ? [item] : [];
    }),
    followUpNext:
      followRows.length > 25 ? writeCollectionCursor(followPage[24]) : null,
    followUpTotal: followCount[0]?.total ?? 0,
  };
}
