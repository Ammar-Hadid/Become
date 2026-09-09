import { companyExplorationWhere } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { normalizeReusableEntityName } from "@/lib/validation/utils/canonical-name.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getMarket(
  userId: string,
  search: string,
  archived: boolean,
  cursor?: string,
  nicheArchived = false,
  nicheId?: string,
) {
  const where = {
    userId,
    ...companyExplorationWhere(nicheId),
    archivedAt: archived ? { not: null } : null,
    ...(search
      ? { normalizedName: { contains: normalizeReusableEntityName(search) } }
      : {}),
  };
  const ownedCursor = cursor
    ? await prisma.company.findFirst({
        where: { AND: [where, { id: cursor }] },
        select: { id: true },
      })
    : null;
  const [companies, niches, companyCount] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { niches: { include: { niche: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 26,
      ...(ownedCursor ? { cursor: { id: ownedCursor.id }, skip: 1 } : {}),
    }),
    prisma.niche.findMany({
      where: { userId, archivedAt: nicheArchived ? { not: null } : null },
      include: { _count: { select: { companies: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.company.count({ where }),
  ]);
  const contact = await prisma.$queryRaw<
    { companyId: string; lastContact: Date }[]
  >`SELECT r."companyId", MAX(r."occurredAt") AS "lastContact" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind <> 'ATTEMPT_NO_CONTACT' AND r."companyId" IS NOT NULL GROUP BY r."companyId"`;
  const followUps = await prisma.$queryRaw<
    { companyId: string; dueOn: Date | null; title: string }[]
  >`SELECT DISTINCT ON (COALESCE(f."companyId", r."companyId", o."companyId")) COALESCE(f."companyId", r."companyId", o."companyId") AS "companyId", f."dueOn", f.title FROM follow_up f LEFT JOIN interaction i ON i.id=f."interactionId" LEFT JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version LEFT JOIN offer o ON o.id=f."offerId" WHERE f."userId"=${userId} AND f."completedAt" IS NULL AND f."cancelledAt" IS NULL ORDER BY COALESCE(f."companyId", r."companyId", o."companyId"), f."dueOn" ASC NULLS LAST, f.id`;
  const activeNiches = nicheArchived
    ? await prisma.niche.findMany({
        where: { userId, archivedAt: null },
        orderBy: { name: "asc" },
      })
    : niches;
  return {
    activeNiches,
    contact,
    followUps,
    companies: companies.slice(0, 25),
    niches,
    companyCount,
    next: companies.length > 25 ? companies[24].id : null,
  };
}
