import { problemExplorationWhere } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Prisma } from "@/generated/prisma/client";

export const evidenceInclude = {
  receiptAllocation: { include: { transaction: true } },
  observation: {
    include: {
      revisions: {
        select: {
          version: true,
          materialChange: true,
          createdAt: true,
          statement: true,
          sourceDescription: true,
        },
      },
    },
  },
  observationRevision: {
    include: {
      interactionRevision: {
        include: {
          interaction: {
            include: {
              revisions: {
                select: {
                  version: true,
                  materialChange: true,
                  createdAt: true,
                  summary: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProblemEvidenceInclude;
export type LoadedEvidence = Prisma.ProblemEvidenceGetPayload<{
  include: typeof evidenceInclude;
}>;
export function evidenceCondition(
  evidence: LoadedEvidence,
  at = evidence.confirmedAt,
) {
  if (evidence.withdrawnAt) return "WITHDRAWN";
  if (evidence.receiptAllocation) {
    const allocation = evidence.receiptAllocation;
    if (
      allocation.withdrawnAt ||
      !allocation.transaction ||
      allocation.transaction.type !== "INCOME" ||
      !["BUSINESS_REVENUE", "EARNED_WORK"].includes(
        allocation.transaction.inflowKind ?? "",
      )
    )
      return "SOURCE_WITHDRAWN";
    if (
      allocation.needsReviewAt ||
      (allocation.sourceChangedAt && allocation.sourceChangedAt > at)
    )
      return "REVIEW";
  }
  const observation = evidence.observation;
  const source = evidence.observationRevision?.interactionRevision;
  if (observation?.voidedAt || source?.interaction.voidedAt)
    return "SOURCE_WITHDRAWN";
  if (
    observation?.revisions.some((r) => r.materialChange && r.createdAt > at) ||
    source?.interaction.revisions.some(
      (r) => r.materialChange && r.createdAt > at,
    )
  )
    return "REVIEW";
  return "CURRENT";
}
export function getProblemDetail(userId: string, id: string) {
  return prisma.problem.findFirst({
    where: { id, userId },
    include: {
      niche: true,
      evidence: { include: evidenceInclude, orderBy: { createdAt: "desc" } },
      assessments: {
        include: {
          basis: { include: { evidence: { include: evidenceInclude } } },
        },
        orderBy: [{ assessedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}
export async function getProblems(
  userId: string,
  cursor?: string,
  archived = false,
  nicheId?: string,
) {
  const owned = cursor
    ? await prisma.problem.findFirst({ where: { id: cursor, userId } })
    : null;
  const records = await prisma.problem.findMany({
    where: {
      userId,
      archivedAt: archived ? { not: null } : null,
      ...problemExplorationWhere(nicheId),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 26,
    ...(owned ? { cursor: { id: owned.id }, skip: 1 } : {}),
    include: {
      niche: true,
      evidence: {
        include: evidenceInclude,
        where: {
          withdrawnAt: null,
          ...(nicheId
            ? {
                OR: [
                  { observationRevision: { nicheId } },
                  {
                    receiptAllocation: {
                      offerRevision: {
                        offer: { niches: { some: { nicheId } } },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
      assessments: {
        orderBy: [{ assessedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });
  return {
    records: records.slice(0, 25),
    next: records.length > 25 ? records[24].id : null,
  };
}

export async function getObservationChoices(userId: string) {
  const observations = await prisma.observation.findMany({
    where: { userId, voidedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  return observations.map((observation) => ({
    id: observation.id,
    revisionId: observation.revisions[0].id,
    name: `${observation.revisions[0].companySnapshot ?? "No company"} · ${observation.revisions[0].statement.slice(0, 100)}`,
  }));
}

export function evidenceCompanyCounts(evidence: LoadedEvidence[]) {
  const current = evidence.filter((e) => evidenceCondition(e) === "CURRENT");
  const ids = (stance?: string) =>
    new Set(
      current
        .filter((e) => !stance || e.stance === stance)
        .flatMap((e) => {
          const id =
            e.observationRevision?.companyId ?? e.receiptAllocation?.companyId;
          return id ? [id] : [];
        }),
    ).size;
  return {
    total: ids(),
    supporting: ids("SUPPORTS"),
    contradicting: ids("CONTRADICTS"),
    sources: current.length,
  };
}
