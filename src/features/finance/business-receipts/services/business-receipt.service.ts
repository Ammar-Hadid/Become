import { z } from "zod";
import { createHash } from "node:crypto";
import { audienceInputSchema } from "@/features/entrepreneurship/audiences/schemas/audience.schema";
import {
  captureAudience,
  audienceSnapshot,
  targetAudience,
} from "@/features/entrepreneurship/audiences/services/audience.service";
import type { Prisma, FinancialTransaction } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { lockFinancialTransaction } from "@/features/finance/transactions/services/transaction-lock.service";
import { FinanceError } from "@/features/finance/types/finance.types";
import { parseMoney } from "@/lib/money/utils/money.util";

export const isBusinessReceipt = (transaction: {
  type: string;
  inflowKind?: string | null;
}) =>
  transaction.type === "INCOME" &&
  ["BUSINESS_REVENUE", "EARNED_WORK"].includes(transaction.inflowKind ?? "");

// Called only inside the transaction writer's row lock. Allocations are a
// separate attribution dimension from payment/session allocation.
export async function validateBusinessReceiptEdit(
  tx: Prisma.TransactionClient,
  userId: string,
  old: FinancialTransaction,
  next: Pick<
    FinancialTransaction,
    | "type"
    | "currency"
    | "amountMinor"
    | "occurredAt"
    | "workSourceId"
    | "incomeOpportunityId"
    | "counterpartyId"
  > & { inflowKind?: FinancialTransaction["inflowKind"] },
) {
  const sum = await tx.businessReceiptAllocation.aggregate({
    where: { userId, transactionId: old.id, withdrawnAt: null },
    _sum: { amountMinor: true },
  });
  if (
    sum._sum.amountMinor !== null &&
    (!isBusinessReceipt(next) ||
      old.currency !== next.currency ||
      sum._sum.amountMinor > next.amountMinor)
  )
    throw new FinanceError(
      "Withdraw or correct business receipt allocations before changing this receipt’s currency, eligibility or amount below its allocations.",
    );
  if (
    old.amountMinor !== next.amountMinor ||
    old.occurredAt.getTime() !== next.occurredAt.getTime() ||
    old.workSourceId !== next.workSourceId ||
    old.incomeOpportunityId !== next.incomeOpportunityId ||
    old.counterpartyId !== next.counterpartyId ||
    old.inflowKind !== next.inflowKind
  )
    await tx.businessReceiptAllocation.updateMany({
      where: { userId, transactionId: old.id, withdrawnAt: null },
      data: { needsReviewAt: new Date(), sourceChangedAt: new Date() },
    });
}
export async function withdrawDeletedReceipt(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
) {
  await tx.businessReceiptAllocation.updateMany({
    where: { userId, transactionId, withdrawnAt: null },
    data: {
      withdrawnAt: new Date(),
      withdrawalReason:
        "Underlying Finance transaction deleted as a correction.",
      needsReviewAt: new Date(),
    },
  });
  // Detach even previously withdrawn allocations; snapshots remain historical.
  await tx.businessReceiptAllocation.updateMany({
    where: { userId, transactionId },
    data: { transactionId: null },
  });
}

const receiptAttributionSchema = audienceInputSchema.extend({
  nicheId: z.string().optional(),
  offerRevisionId: z.string().nullish(),
  engagementId: z.string().nullish(),
  amount: z.string().min(1),
  note: z.string().max(6000).nullish(),
});
export async function allocateBusinessReceipt(
  userId: string,
  transactionId: string,
  key: string,
  input: unknown,
) {
  const data = receiptAttributionSchema.parse(input);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new FinanceError("Reopen this form before saving.");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ...data,
        segmentIds: [...new Set(data.segmentIds)].sort(),
      }),
    )
    .digest("hex");
  return prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, transactionId);
    const receipt = await tx.financialTransaction.findFirstOrThrow({
      where: { id: transactionId, userId },
    });
    let amountMinor: bigint;
    try {
      amountMinor = parseMoney(data.amount, receipt.currency);
    } catch (e) {
      throw new FinanceError((e as Error).message);
    }
    const prior = await tx.businessReceiptAllocation.findUnique({
      where: { id: key },
    });
    if (prior) {
      if (
        prior.userId !== userId ||
        prior.originalTransactionId !== transactionId ||
        (prior.attributionFingerprint
          ? prior.attributionFingerprint !== fingerprint
          : prior.companyId !== (data.companyId || null) ||
            prior.offerRevisionId !== (data.offerRevisionId || null) ||
            prior.amountMinor !== amountMinor ||
            prior.note !== (data.note?.trim() || null))
      )
        throw new FinanceError(
          "This submission was already saved with different attribution. Reopen the form for a correction.",
        );
      return { id: prior.id };
    }
    if (!isBusinessReceipt(receipt))
      throw new FinanceError(
        "Only actual business-revenue or earned-work income can be attributed.",
      );
    if (amountMinor <= 0n)
      throw new FinanceError("Allocate a positive amount.");
    const revision = data.offerRevisionId
      ? await tx.offerRevision.findFirst({
          where: {
            id: data.offerRevisionId,
            userId,
            proposedAt: { not: null },
          },
          include: { offer: { include: { niches: true, engagements: true } } },
        })
      : null;
    if (data.offerRevisionId && !revision)
      throw new FinanceError(
        "Choose terms that were actually proposed or shared.",
      );
    const engagement = data.engagementId
      ? await tx.offerEngagement.findFirst({
          where: { id: data.engagementId, userId },
        })
      : revision?.offer.mode === "SPECIFIC"
        ? revision.offer.engagements[0]
        : null;
    if (
      data.engagementId &&
      (!engagement || !revision || engagement.offerId !== revision.offerId)
    )
      throw new FinanceError(
        "Choose a recipient belonging to these exact offer terms.",
      );
    if (revision?.offer.mode === "AUDIENCE_TEST" && !engagement)
      throw new FinanceError("Choose the response this payment belongs to.");
    if (
      engagement &&
      revision &&
      !(await tx.offerEvent.findFirst({
        where: {
          userId,
          engagementId: engagement.id,
          offerRevisionId: revision.id,
          retractedAt: null,
        },
      }))
    )
      throw new FinanceError(
        "This recipient has no recorded response to these terms.",
      );
    const target = engagement ?? revision;
    if (
      target &&
      ((data.companyId && target.companyId !== data.companyId) ||
        (data.personId && target.personId !== data.personId))
    )
      throw new FinanceError(
        "The receipt recipient must match the selected offer response.",
      );
    const nicheId =
      data.nicheId ||
      (revision?.offer.niches.length === 1
        ? revision.offer.niches[0].nicheId
        : null);
    const niche = nicheId
      ? await tx.niche.findFirst({
          where: { id: nicheId, userId, archivedAt: null },
        })
      : null;
    if (nicheId && !niche)
      throw new FinanceError("Choose an available exploration you own.");
    if (
      niche &&
      revision &&
      !revision.offer.niches.some((n) => n.nicheId === niche.id)
    )
      throw new FinanceError("This offer belongs to a different exploration.");
    const audience = target
      ? targetAudience(audienceSnapshot(target))
      : targetAudience(await captureAudience(tx, userId, data, niche?.id));
    if (!audience.companyId && !niche)
      throw new FinanceError(
        "Choose the exploration this consumer or audience receipt belongs to.",
      );
    const sum = await tx.businessReceiptAllocation.aggregate({
      where: { userId, transactionId, withdrawnAt: null },
      _sum: { amountMinor: true },
    });
    if ((sum._sum.amountMinor ?? 0n) + amountMinor > receipt.amountMinor)
      throw new FinanceError(
        "Business allocations exceed the received amount.",
      );
    const record = await tx.businessReceiptAllocation.create({
      data: {
        id: key,
        userId,
        transactionId,
        originalTransactionId: transactionId,
        attributionFingerprint: fingerprint,
        ...audience,
        nicheId: niche?.id,
        nicheSnapshot: niche?.name,
        offerRevisionId: revision?.id,
        engagementId: engagement?.id,
        amountMinor,
        currencySnapshot: receipt.currency,
        occurredAtSnapshot: receipt.occurredAt,
        note: data.note?.trim() || null,
      },
    });
    return { id: record.id };
  });
}

export async function resolveBusinessAllocation(
  userId: string,
  id: string,
  action: "WITHDRAW" | "RECONFIRM",
  reason: string,
) {
  if (!["WITHDRAW", "RECONFIRM"].includes(action))
    throw new FinanceError("Choose a valid attribution action.");
  if (action === "WITHDRAW" && !reason.trim())
    throw new FinanceError("Explain this attribution correction.");
  const initial = await prisma.businessReceiptAllocation.findFirst({
    where: { id, userId },
  });
  if (!initial?.transactionId)
    throw new FinanceError("The source receipt is no longer available.");
  return prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, initial.transactionId!);
    const allocation = await tx.businessReceiptAllocation.findFirstOrThrow({
      where: { id, userId },
      include: { transaction: true },
    });
    if (allocation.withdrawnAt) return { id };
    if (action === "RECONFIRM") {
      if (!allocation.transaction || !isBusinessReceipt(allocation.transaction))
        throw new FinanceError("This source is not eligible receipt evidence.");
      await tx.businessReceiptAllocation.update({
        where: { id },
        data: { confirmedAt: new Date(), needsReviewAt: null },
      });
    } else
      await tx.businessReceiptAllocation.update({
        where: { id },
        data: {
          withdrawnAt: new Date(),
          withdrawalReason: reason.trim().slice(0, 2000),
        },
      });
    return { id };
  });
}
