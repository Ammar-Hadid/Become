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

export async function allocateBusinessReceipt(
  userId: string,
  transactionId: string,
  key: string,
  input: {
    companyId: string;
    offerRevisionId?: string | null;
    amount: string;
    note?: string | null;
  },
) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new FinanceError("Reopen this form before saving.");
  return prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, transactionId);
    const receipt = await tx.financialTransaction.findFirstOrThrow({
      where: { id: transactionId, userId },
    });
    let amountMinor: bigint;
    try {
      amountMinor = parseMoney(input.amount, receipt.currency);
    } catch (error) {
      throw new FinanceError((error as Error).message);
    }
    const prior = await tx.businessReceiptAllocation.findUnique({
      where: { id: key },
    });
    if (prior) {
      if (
        prior.userId !== userId ||
        prior.originalTransactionId !== transactionId ||
        prior.companyId !== input.companyId ||
        prior.offerRevisionId !== (input.offerRevisionId || null) ||
        prior.amountMinor !== amountMinor ||
        prior.note !== (input.note?.trim() || null)
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
    const company = await tx.company.findFirst({
      where: { id: input.companyId, userId, archivedAt: null },
    });
    if (!company) throw new FinanceError("Choose an active company you own.");
    if (
      input.offerRevisionId &&
      !(await tx.offerRevision.findFirst({
        where: {
          id: input.offerRevisionId,
          companyId: company.id,
          userId,
          proposedAt: { not: null },
        },
      }))
    )
      throw new FinanceError(
        "Choose a proposed revision belonging to this company.",
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
        companyId: company.id,
        companySnapshot: company.name,
        offerRevisionId: input.offerRevisionId || null,
        amountMinor,
        currencySnapshot: receipt.currency,
        occurredAtSnapshot: receipt.occurredAt,
        note: input.note?.trim().slice(0, 6000) || null,
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
