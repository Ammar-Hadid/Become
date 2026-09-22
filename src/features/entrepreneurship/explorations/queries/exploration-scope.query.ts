import { Prisma } from "@/generated/prisma/client";

/** SQL equivalent of problemExplorationWhere, including captured evidence scope. */
export function problemExplorationSql(
  userId: string,
  nicheId: string,
  problemId: Prisma.Sql,
) {
  return Prisma.sql`EXISTS(
    SELECT 1 FROM problem scoped_problem
    WHERE scoped_problem.id=${problemId} AND scoped_problem."userId"=${userId}
      AND (scoped_problem."nicheId"=${nicheId} OR EXISTS(
        SELECT 1 FROM problem_evidence scoped_evidence
        JOIN observation_revision scoped_observation ON scoped_observation.id=scoped_evidence."observationRevisionId" AND scoped_observation."userId"=scoped_evidence."userId"
        WHERE scoped_evidence."problemId"=scoped_problem.id AND scoped_evidence."userId"=${userId}
          AND scoped_evidence."withdrawnAt" IS NULL AND scoped_observation."nicheId"=${nicheId}
      ))
  )`;
}

/** SQL equivalent of offerExplorationWhere for scoped collections and sources. */
export function offerExplorationSql(
  userId: string,
  nicheId: string,
  offerId: Prisma.Sql,
) {
  return Prisma.sql`(EXISTS(SELECT 1 FROM offer_niche scoped_niche WHERE scoped_niche."offerId"=${offerId} AND scoped_niche."nicheId"=${nicheId} AND scoped_niche."userId"=${userId})
    OR EXISTS(SELECT 1 FROM offer_revision scoped_revision JOIN offer_revision_problem scoped_link ON scoped_link."offerRevisionId"=scoped_revision.id AND scoped_link."userId"=scoped_revision."userId" JOIN problem scoped_problem ON scoped_problem.id=scoped_link."problemId" AND scoped_problem."userId"=scoped_link."userId" WHERE scoped_revision."offerId"=${offerId} AND scoped_revision."userId"=${userId} AND scoped_problem."nicheId"=${nicheId}))`;
}
export function problemExplorationWhere(
  nicheId?: string,
): Prisma.ProblemWhereInput {
  return nicheId
    ? {
        OR: [
          { nicheId },
          {
            evidence: {
              some: { withdrawnAt: null, observationRevision: { nicheId } },
            },
          },
        ],
      }
    : {};
}
export function offerExplorationWhere(
  nicheId?: string,
): Prisma.OfferWhereInput {
  return nicheId
    ? {
        OR: [
          { niches: { some: { nicheId } } },
          {
            revisions: {
              some: { problems: { some: { problem: { nicheId } } } },
            },
          },
        ],
      }
    : {};
}
export function companyExplorationWhere(
  nicheId?: string,
): Prisma.CompanyWhereInput {
  return nicheId
    ? {
        OR: [
          { niches: { some: { nicheId } } },
          { interactionRevisions: { some: { nicheId } } },
          { observationRevisions: { some: { nicheId } } },
          { offers: { some: offerExplorationWhere(nicheId) } },
        ],
      }
    : {};
}
