import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { Prisma } from "@/generated/prisma/client";

export async function getConversationIndex(userId: string, nicheId: string) {
  const conversations = await prisma.interaction.findMany({
    where: {
      userId,
      voidedAt: null,
      revisions: { some: { nicheId, kind: "CONVERSATION" } },
    },
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
  return conversations.filter(
    (conversation) =>
      conversation.revisions[0]?.kind === "CONVERSATION" &&
      conversation.revisions[0]?.nicheId === nicheId,
  );
}

export async function getConversationWorkspace(
  userId: string,
  interactionId: string,
  nicheId?: string,
) {
  const conversation = await prisma.interaction.findFirst({
    where: { id: interactionId, userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: { audienceContext: audienceInclude },
      },
      interviewSession: {
        include: { guideRevision: { include: { guide: true } } },
      },
      conversationMessages: {
        orderBy: { position: "asc" },
        include: {
          revisions: { orderBy: { version: "desc" } },
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
  return {
    ...conversation,
    conversationMessages: conversation.conversationMessages.map((message) => ({
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
      conversation.conversationMessages.length === 0,
  };
}

export async function getLearnWorkspace(userId: string, nicheId: string) {
  const [facts, guides] = await Promise.all([
    prisma.$queryRaw<
      { conversations: number; observations: number; sources: number }[]
    >(Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM interaction i
          JOIN interaction_revision r
            ON r."interactionId" = i.id AND r.version = i.version
          WHERE i."userId" = ${userId} AND i."voidedAt" IS NULL
            AND r."nicheId" = ${nicheId} AND r.kind = 'CONVERSATION'
        ) AS conversations,
        (
          SELECT COUNT(*)::int
          FROM observation o
          JOIN observation_revision r
            ON r."observationId" = o.id AND r.version = o.version
          WHERE o."userId" = ${userId} AND o."voidedAt" IS NULL
            AND r."nicheId" = ${nicheId}
        ) AS observations,
        (
          SELECT (
            SELECT COUNT(*)
            FROM interaction i
            JOIN interaction_revision r
              ON r."interactionId" = i.id AND r.version = i.version
            WHERE i."userId" = ${userId} AND i."voidedAt" IS NULL
              AND r."nicheId" = ${nicheId} AND r.kind = 'CONVERSATION'
          ) + (
            SELECT COUNT(*)
            FROM observation o
            JOIN observation_revision r
              ON r."observationId" = o.id AND r.version = o.version
            WHERE o."userId" = ${userId} AND o."voidedAt" IS NULL
              AND r."nicheId" = ${nicheId} AND r."interactionId" IS NULL
          )
        )::int AS sources
    `),
    prisma.interviewGuide.count({
      where: { userId, nicheId, archivedAt: null },
    }),
  ]);
  return {
    conversations: facts[0]?.conversations ?? 0,
    observations: facts[0]?.observations ?? 0,
    sources: facts[0]?.sources ?? 0,
    guides,
  };
}
