import { searchBusinessRecords } from "@/features/entrepreneurship/shared/queries/business-record-search.query";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
import {
  audienceInclude,
} from "@/features/entrepreneurship/audiences/utils/audience.util";
import {
  companyExplorationWhere,
  problemExplorationWhere,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function getInteractionOptions(userId: string, nicheId?: string) {
  const [companies, niches, problems, recent] = await Promise.all([
    prisma.company.findMany({
      where: { userId, archivedAt: null, ...companyExplorationWhere(nicheId) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.niche.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.problem.findMany({
      where: { userId, archivedAt: null, ...problemExplorationWhere(nicheId) },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    searchBusinessRecords(userId, { kind: "interaction", nicheId }),
  ]);
  return {
    ...(await getAudienceOptions(userId, nicheId)),
    companies,
    niches,
    problems: problems.map((p) => ({ id: p.id, name: p.title })),
    replies: recent.items,
  };
}

export async function getInteractionJournal(
  userId: string,
  {
    kind,
    companyId,
    cursor,
    nicheId,
  }: {
    kind?: string;
    companyId?: string;
    cursor?: string;
    nicheId?: string;
  } = {},
) {
  const cursorRow = cursor
    ? await prisma.interaction.findFirst({
        where: { id: cursor, userId },
        include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
      })
    : null;
  const ids = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT i.id FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL ${nicheId ? Prisma.sql`AND r."nicheId"=${nicheId}` : Prisma.empty} ${kind ? Prisma.sql`AND r.kind=${kind}` : Prisma.empty} ${companyId ? Prisma.sql`AND r."companyId"=${companyId}` : Prisma.empty} ${cursorRow ? Prisma.sql`AND (r."occurredAt", i.id) < (${cursorRow.revisions[0].occurredAt}, ${cursorRow.id})` : Prisma.empty} ORDER BY r."occurredAt" DESC, i.id DESC LIMIT 26`,
  );
  const records = await prisma.interaction.findMany({
    where: { userId, id: { in: ids.slice(0, 25).map((row) => row.id) } },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: {
          audienceContext: audienceInclude,
          observations: {
            include: { observation: true, audienceContext: audienceInclude },
          },
        },
      },
    },
  });
  return {
    records: ids
      .slice(0, 25)
      .map((row) => records.find((record) => record.id === row.id)!),
    next: ids.length > 25 ? ids[24].id : null,
  };
}

export function getInteractionDetail(userId: string, id: string) {
  return prisma.interaction.findFirst({
    where: { id, userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: {
          audienceContext: audienceInclude,
          observations: {
            include: {
              observation: true,
              audienceContext: audienceInclude,
              evidence: { include: { problem: true } },
            },
          },
        },
      },
      followUps: { orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }] },
    },
  });
}

export async function getLinkedReplies(userId: string, id: string) {
  return prisma.$queryRaw<
    {
      id: string;
      summary: string;
      occurredAt: Date;
      companySnapshot: string | null;
    }[]
  >`SELECT i.id, r.summary, r."occurredAt", r."companySnapshot" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."respondsToInteractionId"=${id} ORDER BY r."occurredAt" DESC`;
}
