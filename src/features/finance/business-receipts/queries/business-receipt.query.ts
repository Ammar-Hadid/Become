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
