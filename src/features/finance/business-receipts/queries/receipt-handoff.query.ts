import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceName } from "@/features/entrepreneurship/audiences/utils/audience.util";
export async function getReceiptHandoff(
  userId: string,
  scope: {
    company?: string;
    offer?: string;
    engagement?: string;
    exploration?: string;
  },
) {
  const [company, offer, niche] = await Promise.all([
    scope.company
      ? prisma.company.findFirst({
          where: { userId, id: scope.company },
          include: { workSources: true },
        })
      : null,
    scope.offer
      ? prisma.offer.findFirst({
          where: { userId, id: scope.offer },
          include: {
            engagements: true,
            niches: true,
            revisions: { orderBy: { version: "desc" }, take: 1 },
          },
        })
      : null,
    scope.exploration
      ? prisma.niche.findFirst({ where: { userId, id: scope.exploration } })
      : null,
  ]);
  if (
    (scope.company && !company) ||
    (scope.offer && !offer) ||
    (scope.exploration && !niche)
  )
    return null;
  const recipient = scope.engagement
    ? offer?.engagements.find((e) => e.id === scope.engagement)
    : offer?.mode === "SPECIFIC"
      ? offer.engagements[0]
      : null;
  if (scope.engagement && !recipient) return null;
  if (
    offer &&
    company &&
    (recipient?.companyId ?? offer.companyId) !== company.id
  )
    return null;
  if (offer && niche && !offer.niches.some((n) => n.nicheId === niche.id))
    return null;
  const returnPath = offer
    ? `/entrepreneurship/offers/${offer.id}${offer.mode === "AUDIENCE_TEST" && recipient ? `#response-${recipient.id}` : "#receipts"}`
    : company
      ? `/entrepreneurship/market/companies/${company.id}#receipts`
      : niche
        ? `/entrepreneurship/explorations/${niche.id}`
        : null;
  if (!returnPath) return null;
  return {
    returnPath,
    label: recipient
      ? audienceName(recipient)
      : (company?.name ?? offer?.revisions[0]?.title ?? niche!.name),
    returnLabel: offer ? "offer" : company ? "business" : "exploration",
    workSourceId:
      recipient?.workSourceId ??
      (company?.workSources.length === 1
        ? company.workSources[0].workSourceId
        : undefined),
    companyId: company?.id,
    offerId: offer?.id,
    engagementId: recipient?.id,
    nicheId: niche?.id,
  };
}
