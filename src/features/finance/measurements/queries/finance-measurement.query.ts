import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
export type FinanceMetricScope = {
  userId: string;
  start: Date;
  end: Date;
  currency: string;
  workSourceId?: string;
  companyId?: string;
  offerRevisionId?: string;
};
export async function readSourceIncome(
  tx: DirectionTx,
  s: FinanceMetricScope,
  offset = 0,
) {
  const where = {
    userId: s.userId,
    type: "INCOME" as const,
    inflowKind: "EARNED_WORK" as const,
    currency: s.currency,
    workSourceId: s.workSourceId,
    occurredAt: { gte: s.start, lt: s.end },
  };
  const [total, rows, digest] = await Promise.all([
    tx.financialTransaction.aggregate({
      where,
      _sum: { amountMinor: true },
      _count: true,
    }),
    tx.financialTransaction.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: 25,
      include: { workSource: { select: { name: true } } },
    }),
    tx.$queryRaw<{ hash: string }[]>(
      Prisma.sql`SELECT md5(COALESCE(string_agg(id || ':' || "amountMinor"::text || ':' || "occurredAt"::text, ',' ORDER BY id),'')) AS hash FROM financial_transaction WHERE "userId"=${s.userId} AND type='INCOME' AND "inflowKind"='EARNED_WORK' AND currency=${s.currency} ${s.workSourceId ? Prisma.sql`AND "workSourceId"=${s.workSourceId}` : Prisma.empty} AND "occurredAt">=${s.start} AND "occurredAt"<${s.end}`,
    ),
  ]);
  return {
    amount: total._sum.amountMinor ?? 0n,
    count: total._count,
    rows,
    hash: digest[0].hash,
  };
}
export async function readBusinessIncome(
  tx: DirectionTx,
  s: FinanceMetricScope,
  offset = 0,
) {
  const where: Prisma.BusinessReceiptAllocationWhereInput = {
    userId: s.userId,
    companyId: s.companyId,
    ...(s.offerRevisionId ? { offerRevisionId: s.offerRevisionId } : {}),
    withdrawnAt: null,
    needsReviewAt: null,
    transaction: {
      userId: s.userId,
      type: "INCOME",
      inflowKind: { in: ["BUSINESS_REVENUE", "EARNED_WORK"] },
      currency: s.currency,
      occurredAt: { gte: s.start, lt: s.end },
    },
  };
  const [total, rows, pending, digest] = await Promise.all([
    tx.businessReceiptAllocation.aggregate({
      where,
      _sum: { amountMinor: true },
      _count: true,
    }),
    tx.businessReceiptAllocation.findMany({
      where,
      orderBy: [{ occurredAtSnapshot: "desc" }, { id: "desc" }],
      skip: offset,
      take: 25,
      include: { transaction: true, company: { select: { name: true } } },
    }),
    tx.businessReceiptAllocation.count({
      where: { ...where, needsReviewAt: { not: null } },
    }),
    tx.$queryRaw<{ hash: string }[]>(
      Prisma.sql`SELECT md5(COALESCE(string_agg(a.id || ':' || a."amountMinor"::text || ':' || t."occurredAt"::text,',' ORDER BY a.id),'')) AS hash FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" WHERE a."userId"=${s.userId} ${s.companyId ? Prisma.sql`AND a."companyId"=${s.companyId}` : Prisma.empty} ${s.offerRevisionId ? Prisma.sql`AND a."offerRevisionId"=${s.offerRevisionId}` : Prisma.empty} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('EARNED_WORK','BUSINESS_REVENUE') AND t.currency=${s.currency} AND t."occurredAt">=${s.start} AND t."occurredAt"<${s.end}`,
    ),
  ]);
  return {
    amount: total._sum.amountMinor ?? 0n,
    count: total._count,
    rows,
    pending,
    hash: digest[0].hash,
  };
}
// Current Company–WorkSource memberships are deliberately NOT historical payment attribution.
export async function readCompanyPaymentHistory(
  tx: DirectionTx,
  userId: string,
  companyId: string,
  before: Date,
) {
  const where: Prisma.BusinessReceiptAllocationWhereInput = {
    userId,
    companyId,
    withdrawnAt: null,
    transaction: {
      userId,
      type: "INCOME",
      inflowKind: { in: ["BUSINESS_REVENUE", "EARNED_WORK"] },
      occurredAt: { lt: before },
    },
  };
  const [confirmed, pending] = await Promise.all([
    tx.businessReceiptAllocation.count({
      where: { ...where, needsReviewAt: null },
    }),
    tx.businessReceiptAllocation.count({
      where: { ...where, needsReviewAt: { not: null } },
    }),
  ]);
  return { confirmed, pending };
}
export async function readRecurringRevisionReceipts(
  tx: DirectionTx,
  userId: string,
  companyId: string,
  revisionId: string,
  currency: string,
  start: Date,
  end: Date,
) {
  const base = await readBusinessIncome(tx, {
    userId,
    companyId,
    offerRevisionId: revisionId,
    currency,
    start,
    end,
  });
  // State is evaluated at EACH actual receipt, over the complete qualifying set.
  const scope = Prisma.sql`a."userId"=${userId} AND a."companyId"=${companyId} AND a."offerRevisionId"=${revisionId} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('EARNED_WORK','BUSINESS_REVENUE') AND t.currency=${currency} AND t."occurredAt">=${start} AND t."occurredAt"<${end} AND state.kind='ACCEPTED' AND (state."interactionRevisionId" IS NULL OR EXISTS (SELECT 1 FROM interaction_revision ir JOIN interaction i ON i.id=ir."interactionId" AND i."userId"=ir."userId" WHERE ir.id=state."interactionRevisionId" AND ir."userId"=${userId} AND i."voidedAt" IS NULL AND i.version=ir.version AND (ir."companyId" IS NULL OR ir."companyId"=${companyId})))`;
  const from = Prisma.sql`FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" JOIN LATERAL (SELECT e.* FROM offer_event e WHERE e."userId"=${userId} AND e."offerRevisionId"=${revisionId} AND e."retractedAt" IS NULL AND e."occurredAt"<=t."occurredAt" ORDER BY e."occurredAt" DESC,e."createdAt" DESC,e.id DESC LIMIT 1) state ON true WHERE ${scope}`;
  const [total, records] = await Promise.all([
    tx.$queryRaw<{ amount: bigint; count: number; hash: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM(a."amountMinor"),0)::bigint AS amount,COUNT(*)::int AS count,md5(COALESCE(string_agg(a.id||':'||a."amountMinor"::text||':'||t."occurredAt"::text||':'||state.id,',' ORDER BY a.id),'')) AS hash ${from}`,
    ),
    tx.$queryRaw<
      {
        id: string;
        transactionId: string;
        occurredAt: Date;
        amountMinor: bigint;
      }[]
    >(
      Prisma.sql`SELECT a.id,a."transactionId",t."occurredAt",a."amountMinor" ${from} ORDER BY t."occurredAt" DESC,a.id DESC LIMIT 25`,
    ),
  ]);
  return {
    ...total[0],
    records,
    pending: base.pending,
    excluded: base.count - total[0].count,
  };
}
