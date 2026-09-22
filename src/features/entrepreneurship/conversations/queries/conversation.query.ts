import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { Prisma } from "@/generated/prisma/client";

import {
  collectionSearch,
  readCollectionCursor,
  writeCollectionCursor,
} from "@/features/entrepreneurship/shared/utils/collection-cursor.util";

export async function getConversationIndex(userId: string, nicheId: string) {
  return (await getConversationPage(userId, nicheId)).items;
}

export async function getConversationPage(
  userId: string,
  nicheId: string,
  options: { q?: string; status?: string; cursor?: string } = {},
) {
  const cursor = readCollectionCursor(options.cursor);
  const search = collectionSearch(options.q);
  const status = options.status === "PAUSED" ? "CANCELLED" : options.status;
  const where = Prisma.sql`i."userId"=${userId} AND i."voidedAt" IS NULL AND r."nicheId"=${nicheId} AND r.kind='CONVERSATION'
    ${status ? Prisma.sql`AND i.status=${status}` : Prisma.empty}
    ${options.status === "PAUSED" ? Prisma.sql`AND EXISTS(SELECT 1 FROM interview_session s WHERE s."interactionId"=i.id AND s."userId"=${userId})` : Prisma.empty}
    ${search ? Prisma.sql`AND concat_ws(' ',r.summary,r."personSnapshot",r."companySnapshot",r."audienceLabel") ILIKE ${search}` : Prisma.empty}`;
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<{ id: string; date: Date }[]>(
      Prisma.sql`SELECT i.id,r."occurredAt" AS date FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId" WHERE ${where} ${cursor ? Prisma.sql`AND (r."occurredAt",i.id)<(${cursor.date},${cursor.id})` : Prisma.empty} ORDER BY r."occurredAt" DESC,i.id DESC LIMIT 26`,
    ),
    prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId" WHERE ${where}`,
    ),
  ]);
  const page = rows.slice(0, 25);
  const conversations = await prisma.interaction.findMany({
    where: { userId, id: { in: page.map((row) => row.id) } },
    orderBy: { createdAt: "desc" },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { audienceContext: audienceInclude },
      },
      interviewSession: {
        select: {
          status: true,
          updatedAt: true,
          guideRevision: {
            select: { id: true, version: true, titleSnapshot: true },
          },
        },
      },
      conversationMessages: {
        where: { voidedAt: null },
        orderBy: { position: "desc" },
        take: 1,
        include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
      },
      _count: {
        select: { conversationMessages: { where: { voidedAt: null } } },
      },
    },
  });
  const byId = new Map(conversations.map((item) => [item.id, item]));
  return {
    items: page.flatMap((row) => {
      const item = byId.get(row.id);
      return item ? [item] : [];
    }),
    next: rows.length > 25 ? writeCollectionCursor(page[24]) : null,
    total: counts[0]?.total ?? 0,
  };
}

export async function getConversationWorkspace(
  userId: string,
  interactionId: string,
  nicheId?: string,
  options: { before?: number; history?: boolean; message?: string } = {},
) {
  const selectedMessage = options.message
    ? await prisma.conversationMessage.findFirst({
        where: { id: options.message, interactionId, userId },
        select: { position: true },
      })
    : null;
  const before = selectedMessage
    ? selectedMessage.position + 26
    : options.before;
  const conversation = await prisma.interaction.findFirst({
    where: { id: interactionId, userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: options.history ? 50 : 1,
        include: { audienceContext: audienceInclude },
      },
      interviewSession: {
        include: { guideRevision: { include: { guide: true } } },
      },
      _count: { select: { conversationMessages: true } },
      conversationMessages: {
        where: Number.isSafeInteger(before)
          ? { position: { lt: before } }
          : undefined,
        orderBy: { position: "desc" },
        take: 51,
        include: {
          revisions: {
            orderBy: { version: "desc" },
            take: options.history ? 50 : 1,
          },
          observationRevisions: {
            where: { observation: { voidedAt: null } },
            include: { observation: true },
          },
        },
      },
      followUps: { orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (
    !conversation ||
    conversation.revisions[0]?.kind !== "CONVERSATION" ||
    (nicheId && conversation.revisions[0]?.nicheId !== nicheId)
  )
    return null;
  const linkedReach = conversation.revisions[0].respondsToInteractionId
    ? await prisma.interaction.findFirst({
        where: {
          id: conversation.revisions[0].respondsToInteractionId,
          userId,
        },
        include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
      })
    : null;
  const debrief = await getConversationDebriefMessages(userId, interactionId);
  return {
    ...conversation,
    debriefMessages: debrief.items,
    debriefNext: debrief.next,
    debriefTotal: debrief.total,
    hasEarlier: conversation.conversationMessages.length > 50,
    earlierCursor:
      conversation.conversationMessages.length > 50
        ? conversation.conversationMessages[49].position
        : null,
    totalMessages: conversation._count.conversationMessages,
    conversationMessages: conversation.conversationMessages
      .slice(0, 50)
      .reverse()
      .map((message) => ({
        ...message,
        sourceOutdated:
          Boolean(message.voidedAt) ||
          message.observationRevisions.some(
            (observation) =>
              observation.sourceMessageRevisionId !== message.revisions[0]?.id,
          ),
      })),
    linkedReach,
    historicalSummaryOnly:
      conversation.interviewSession === null &&
      conversation.status === "COMPLETED" &&
      conversation._count.conversationMessages === 0,
  };
}

/** Debrief candidates are independent of the transcript window. */
export async function getConversationDebriefMessages(
  userId: string,
  interactionId: string,
  cursor?: string,
) {
  const anchor =
    cursor && cursor.length <= 100
      ? await prisma.conversationMessage.findFirst({
          where: { id: cursor, interactionId, userId },
          select: { bookmarkedAt: true, position: true },
        })
      : null;
  const join = Prisma.sql`conversation_message m
    JOIN conversation_message_revision r ON r."messageId"=m.id AND r.version=m.version AND r."userId"=m."userId"
    JOIN interaction i ON i.id=m."interactionId" AND i."userId"=m."userId"
    JOIN interaction_revision ir ON ir."interactionId"=i.id AND ir.version=i.version AND ir."userId"=i."userId"`;
  const where = Prisma.sql`m."userId"=${userId} AND m."interactionId"=${interactionId}
    AND m."voidedAt" IS NULL AND i."voidedAt" IS NULL AND ir.kind='CONVERSATION' AND r."speakerRole"='PARTICIPANT'
    AND NOT EXISTS (
      SELECT 1 FROM observation o JOIN observation_revision ob ON ob."observationId"=o.id AND ob.version=o.version AND ob."userId"=o."userId"
      WHERE o."userId"=${userId} AND o."voidedAt" IS NULL AND ob."sourceMessageRevisionId"=r.id
    )`;
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        version: number;
        body: string;
        speakerName: string;
        bookmarked: boolean;
      }[]
    >(Prisma.sql`
      SELECT m.id,m.version,r.body,r."speakerNameSnapshot" AS "speakerName",(m."bookmarkedAt" IS NOT NULL) AS bookmarked
      FROM ${join} WHERE ${where}
      ${anchor ? Prisma.sql`AND ((m."bookmarkedAt" IS NOT NULL),m.position)<(${Boolean(anchor.bookmarkedAt)},${anchor.position})` : Prisma.empty}
      ORDER BY (m."bookmarkedAt" IS NOT NULL) DESC,m.position DESC LIMIT 26`),
    prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM ${join} WHERE ${where}`,
    ),
  ]);
  return {
    items: rows.slice(0, 25),
    next: rows.length > 25 ? rows[24].id : null,
    total: counts[0]?.total ?? 0,
  };
}
