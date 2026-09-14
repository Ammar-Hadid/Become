import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { canonicalName } from "@/features/entrepreneurship/shared/utils/business.util";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import {
  offerExplorationWhere,
  problemExplorationWhere,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
export async function getAudienceOptions(userId: string, nicheId?: string) {
  const [people, segments] = await Promise.all([
    prisma.person.findMany({
      where: {
        userId,
        archivedAt: null,
        ...(nicheId ? { niches: { some: { nicheId } } } : {}),
      },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 100,
    }),
    prisma.audienceSegment.findMany({
      where: {
        userId,
        archivedAt: null,
        ...(nicheId ? { niches: { some: { nicheId } } } : {}),
      },
      select: { id: true, name: true, marketType: true, description: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 100,
    }),
  ]);
  return { people, segments };
}
export async function getAudienceRecords(
  userId: string,
  scope: {
    nicheId?: string;
    kind?: "person" | "segment";
    search?: string;
    archived?: boolean;
    cursor?: string;
  } = {},
) {
  const where = {
    userId,
    archivedAt: scope.archived ? { not: null } : null,
    ...(scope.nicheId ? { niches: { some: { nicheId: scope.nicheId } } } : {}),
    ...(scope.search
      ? {
          normalizedName: {
            contains: canonicalName(scope.search).slice(0, 120),
          },
        }
      : {}),
  };
  const kind = scope.kind ?? "segment";
  const owned = scope.cursor
    ? kind === "person"
      ? await prisma.person.findFirst({
          where: { ...where, id: scope.cursor },
          select: { id: true },
        })
      : await prisma.audienceSegment.findFirst({
          where: { ...where, id: scope.cursor },
          select: { id: true },
        })
    : null;
  const args = {
    where,
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 26,
    ...(owned ? { cursor: { id: owned.id }, skip: 1 } : {}),
  };
  const records =
    kind === "person"
      ? await prisma.person.findMany(args)
      : await prisma.audienceSegment.findMany(args);
  return {
    records: records.slice(0, 25),
    next: records.length > 25 ? records[24].id : null,
  };
}
export async function getAudienceDetail(
  userId: string,
  kind: "person" | "segment",
  id: string,
  nicheId?: string,
) {
  const record =
    kind === "person"
      ? await prisma.person.findFirst({
          where: { id, userId },
          include: { niches: { include: { niche: true } } },
        })
      : await prisma.audienceSegment.findFirst({
          where: { id, userId },
          include: { niches: { include: { niche: true } } },
        });
  if (!record) return null;
  const audienceWhere =
    kind === "person"
      ? { personId: id }
      : { audienceContext: { segments: { some: { segmentId: id } } } };
  const [evidence, problems, offers] = await Promise.all([
    getEvidenceJournal(userId, {
      nicheId,
      ...(kind === "person" ? { personId: id } : { segmentId: id }),
    }),
    prisma.problem.findMany({
      where: { userId, ...problemExplorationWhere(nicheId), ...audienceWhere },
      take: 25,
      orderBy: { createdAt: "desc" },
      include: { audienceContext: audienceInclude },
    }),
    prisma.offer.findMany({
      where: {
        userId,
        ...offerExplorationWhere(nicheId),
        OR: [
          audienceWhere,
          { revisions: { some: audienceWhere } },
          { engagements: { some: audienceWhere } },
        ],
      },
      take: 25,
      orderBy: { createdAt: "desc" },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { audienceContext: audienceInclude },
        },
      },
    }),
  ]);
  return { record, evidence, problems, offers };
}
