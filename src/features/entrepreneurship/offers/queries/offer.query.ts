import { Prisma } from "@/generated/prisma/client";
import {
  collectionSearch,
  readCollectionCursor,
  writeCollectionCursor,
} from "@/features/entrepreneurship/shared/utils/collection-cursor.util";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import {
  offerExplorationWhere,
  offerExplorationSql,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getOffers(
  userId: string,
  cursor?: string,
  archived = false,
  nicheId?: string,
  options: { q?: string; mode?: string } = {},
) {
  const anchor = readCollectionCursor(cursor);
  const search = collectionSearch(options.q),
    mode = ["SPECIFIC", "AUDIENCE_TEST"].find(
      (value) => value === options.mode,
    );
  const relation = Prisma.sql`offer o JOIN LATERAL (SELECT * FROM offer_revision r WHERE r."offerId"=o.id AND r."userId"=o."userId" ORDER BY r.version DESC LIMIT 1) r ON true`;
  const scope = Prisma.sql`o."userId"=${userId} AND ${archived ? Prisma.sql`o."archivedAt" IS NOT NULL` : Prisma.sql`o."archivedAt" IS NULL`}
    ${nicheId ? Prisma.sql`AND ${offerExplorationSql(userId, nicheId, Prisma.sql`o.id`)}` : Prisma.empty}
    ${mode ? Prisma.sql`AND o.mode=${mode}` : Prisma.empty}
    ${search ? Prisma.sql`AND concat_ws(' ',r.title,r.scope,r.terms,o."personSnapshot",o."companySnapshot",o."audienceLabel") ILIKE ${search}` : Prisma.empty}`;
  const [ids, count] = await Promise.all([
    prisma.$queryRaw<{ id: string; date: Date }[]>(
      Prisma.sql`SELECT o.id,o."createdAt" AS date FROM ${relation} WHERE ${scope} ${anchor ? Prisma.sql`AND (o."createdAt",o.id)<(${anchor.date},${anchor.id})` : Prisma.empty} ORDER BY o."createdAt" DESC,o.id DESC LIMIT 26`,
    ),
    prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM ${relation} WHERE ${scope}`,
    ),
  ]);
  const rows = await prisma.offer.findMany({
    where: { userId, id: { in: ids.slice(0, 25).map((row) => row.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      niches: { include: { niche: { select: { id: true, name: true } } } },
      company: true,
      audienceContext: audienceInclude,
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
    records: rows,
    total: count[0]?.total ?? 0,
    next: ids.length > 25 ? writeCollectionCursor(ids[24]) : null,
  };
}
export function getOfferDetail(userId: string, id: string, nicheId?: string) {
  return prisma.offer.findFirst({
    where: { id, userId, ...offerExplorationWhere(nicheId) },
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
