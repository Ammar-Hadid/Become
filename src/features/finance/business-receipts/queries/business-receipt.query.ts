import { formatMoney } from "@/lib/money/utils/money.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getConfirmedBusinessReceipts(
  userId: string,
  start: Date,
  end: Date,
) {
  return prisma.$queryRaw<
    {
      currency: string;
      inflowKind: string;
      amount: string;
      receiptCount: number;
    }[]
  >`SELECT t.currency, t."inflowKind", SUM(a."amountMinor")::text AS amount, COUNT(DISTINCT t.id)::int AS "receiptCount" FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" WHERE a."userId"=${userId} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('BUSINESS_REVENUE','EARNED_WORK') AND t."occurredAt">=${start} AND t."occurredAt"<${end} GROUP BY t.currency,t."inflowKind" ORDER BY t.currency,t."inflowKind"`;
}

export async function getBusinessReceiptWorkspace(
  userId: string,
  transactionId: string,
) {
  const [companies, niches, people, segments, offers, allocations] =
    await Promise.all([
      prisma.company.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.niche.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.person.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.audienceSegment.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true, marketType: true, description: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.offerRevision.findMany({
        where: { userId, proposedAt: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          audienceContext: { include: { segments: true } },
          offer: {
            include: {
              niches: true,
              engagements: {
                include: {
                  audienceContext: { include: { segments: true } },
                  events: {
                    where: { retractedAt: null },
                    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
                  },
                },
              },
            },
          },
        },
      }),
      prisma.businessReceiptAllocation.findMany({
        where: { userId, transactionId },
        include: {
          offerRevision: true,
          audienceContext: { include: { segments: true } },
          engagement: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const attributed = allocations
    .filter((a) => !a.withdrawnAt)
    .reduce((sum, a) => sum + a.amountMinor, 0n);
  const transaction = await prisma.financialTransaction.findFirstOrThrow({
    where: { id: transactionId, userId },
    select: { amountMinor: true },
  });
  return {
    companies,
    niches,
    people,
    segments,
    offers,
    allocations,
    attributed,
    remaining: transaction.amountMinor - attributed,
  };
}

export async function getEntrepreneurshipReceiptPanel(
  userId: string,
  scope: {
    offerId?: string;
    engagementId?: string;
    companyId?: string;
    nicheId?: string;
  },
) {
  const [income, offers, allocations] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        userId,
        type: "INCOME",
        inflowKind: { in: ["BUSINESS_REVENUE", "EARNED_WORK"] },
      },
      include: {
        account: true,
        businessReceiptAllocations: { where: { withdrawnAt: null } },
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.offerRevision.findMany({
      where: {
        userId,
        proposedAt: { not: null },
        ...(scope.offerId ? { offerId: scope.offerId } : {}),
        ...(scope.companyId && !scope.engagementId
          ? { companyId: scope.companyId }
          : {}),
        ...(scope.engagementId
          ? {
              events: {
                some: { engagementId: scope.engagementId, retractedAt: null },
              },
            }
          : {}),
      },
      orderBy: { version: "desc" },
      take: 100,
      select: { id: true, title: true, version: true },
    }),
    prisma.businessReceiptAllocation.findMany({
      where: {
        userId,
        ...(scope.companyId ? { companyId: scope.companyId } : {}),
        ...(scope.engagementId ? { engagementId: scope.engagementId } : {}),
        ...(scope.offerId ? { offerRevision: { offerId: scope.offerId } } : {}),
        ...(scope.nicheId && !scope.offerId ? { nicheId: scope.nicheId } : {}),
      },
      include: {
        transaction: true,
        offerRevision: true,
        audienceContext: { include: { segments: true } },
        engagement: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const receipts = income
    .map((r) => ({
      id: r.id,
      currency: r.currency,
      remaining: (
        r.amountMinor -
        r.businessReceiptAllocations.reduce((s, a) => s + a.amountMinor, 0n)
      ).toString(),
      name: `${businessDate(r.occurredAt)} · ${formatMoney(r.amountMinor, r.currency)} · ${r.account.name}${r.notes ? ` · ${r.notes}` : ""}`,
    }))
    .filter((r) => BigInt(r.remaining) > 0n);
  return { receipts, offers, allocations };
}
