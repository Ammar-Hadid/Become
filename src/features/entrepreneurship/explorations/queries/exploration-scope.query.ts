import { Prisma } from "@/generated/prisma/client";
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
