import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { offerExplorationWhere } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getOffers(
  userId: string,
  cursor?: string,
  archived = false,
  nicheId?: string,
) {
  const owned = cursor
    ? await prisma.offer.findFirst({ where: { id: cursor, userId } })
    : null;
  const rows = await prisma.offer.findMany({
    where: {
      userId,
      archivedAt: archived ? { not: null } : null,
      ...offerExplorationWhere(nicheId),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 26,
    ...(owned ? { cursor: { id: owned.id }, skip: 1 } : {}),
    include: {
      niches: { include: { niche: { select: { id: true, name: true } } } },
      company: true,
      audienceContext: audienceInclude,
      engagements: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          audienceContext: audienceInclude,
          workSource: true,
          events: {
            where: { retractedAt: null },
            orderBy: [
              { occurredAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: { revision: true },
          },
          receipts: { include: { transaction: true } },
        },
      },
      revisions: {
        orderBy: { version: "desc" },
        include: { audienceContext: audienceInclude },
      },
      events: {
        where: { retractedAt: null },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  return {
    records: rows.slice(0, 25),
    next: rows.length > 25 ? rows[24].id : null,
  };
}
export function getOfferDetail(userId: string, id: string) {
  return prisma.offer.findFirst({
    where: { id, userId },
    include: {
      niches: { include: { niche: { select: { id: true, name: true } } } },
      company: true,
      audienceContext: audienceInclude,
      engagements: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          audienceContext: audienceInclude,
          workSource: true,
          events: {
            where: { retractedAt: null },
            orderBy: [
              { occurredAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: { revision: true },
          },
          receipts: { include: { transaction: true } },
        },
      },
      revisions: {
        orderBy: { version: "desc" },
        include: {
          audienceContext: audienceInclude,
          problems: { include: { problem: true } },
          receipts: {
            include: { transaction: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      events: {
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        include: { revision: true },
      },
      followUps: true,
    },
  });
}
