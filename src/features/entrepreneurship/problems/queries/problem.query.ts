import {
  audienceInclude,
  audienceName,
} from "@/features/entrepreneurship/audiences/utils/audience.util";
import { problemExplorationWhere } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Prisma } from "@/generated/prisma/client";

export const evidenceInclude = {
  receiptAllocation: {
    include: { transaction: true, audienceContext: audienceInclude },
  },
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
      audienceContext: audienceInclude,
      sourceMessage: {
        include: {
          revisions: {
            select: { version: true, createdAt: true },
          },
        },
      },
      sourceMessageRevision: { select: { version: true } },
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
  const sourceMessage = evidence.observationRevision?.sourceMessage;
  if (
    observation?.voidedAt ||
    source?.interaction.voidedAt ||
    sourceMessage?.voidedAt
  )
    return "SOURCE_WITHDRAWN";
  if (
    observation?.revisions.some((r) => r.materialChange && r.createdAt > at) ||
    source?.interaction.revisions.some(
      (r) => r.materialChange && r.createdAt > at,
    ) ||
    sourceMessage?.revisions.some(
      (revision) =>
        revision.version >
          (evidence.observationRevision?.sourceMessageRevision?.version ?? 0) &&
        revision.createdAt > at,
    )
  )
    return "REVIEW";
  return "CURRENT";
}
export function getProblemDetail(userId: string, id: string) {
  return prisma.problem.findFirst({
    where: { id, userId },
    include: {
      audienceContext: audienceInclude,
      audienceRevisions: {
        orderBy: { version: "desc" },
        include: { audienceContext: audienceInclude },
      },
      niche: true,
      evidence: { include: evidenceInclude, orderBy: { createdAt: "desc" } },
      assessments: {
        include: {
          audienceRevision: { include: { audienceContext: audienceInclude } },
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
      audienceContext: audienceInclude,
      audienceRevisions: {
        orderBy: { version: "desc" },
        include: { audienceContext: audienceInclude },
      },
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

export async function getObservationChoices(userId: string, nicheId?: string) {
  const observations = await prisma.observation.findMany({
    where: {
      userId,
      voidedAt: null,
      ...(nicheId ? { revisions: { some: { nicheId } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  return observations.map((observation) => ({
    id: observation.id,
    revisionId: observation.revisions[0].id,
    name: `${audienceName(observation.revisions[0])} · ${observation.revisions[0].statement.slice(0, 100)}`,
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
    supportingSources: current.filter((e) => e.stance === "SUPPORTS").length,
    contradictingSources: current.filter((e) => e.stance === "CONTRADICTS")
      .length,
    people: new Set(
      current.flatMap((e) => {
        const id =
          e.observationRevision?.personId ?? e.receiptAllocation?.personId;
        return id ? [id] : [];
      }),
    ).size,
    businesses: ids(),
    anonymous: current.filter((e) =>
      ["ANONYMOUS", "UNSPECIFIED"].includes(
        e.observationRevision?.identityKind ??
          e.receiptAllocation?.identityKind ??
          "UNSPECIFIED",
      ),
    ).length,
    aggregate: current.filter(
      (e) => e.observationRevision?.identityKind === "GROUP",
    ).length,
  };
}
