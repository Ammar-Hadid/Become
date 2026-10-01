import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { evidenceWindow } from "../utils/financial-evidence.util";
export async function confirmEvidenceTransfer(
  userId: string,
  observationId: string,
  otherAccountId: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const link = await tx.financialEvidenceLink.findFirst({
      where: { userId, observationId },
      include: {
        account: true,
        observation: { include: { statementImport: true } },
      },
    });
    const other = await tx.financialAccount.findFirst({
      where: { userId, id: otherAccountId, archivedAt: null },
    });
    if (
      !link?.accountId ||
      !other ||
      other.currency !== link.observation.currency ||
      other.id === link.accountId ||
      link.observation.bookingStatus !== "BOOKED"
    )
      throw new FinanceError(
        "Choose a different owned account in the same currency.",
      );
    if (
      link.account?.archivedAt ||
      ["SUPERSEDED", "IGNORED"].includes(link.status) ||
      (link.observation.statementImport &&
        !link.observation.statementImport.confirmedAt)
    )
      throw new FinanceError(
        "Use current confirmed evidence from an active account.",
      );
    const o = link.observation;
    const from = o.direction === "DEBIT" ? link.accountId : other.id;
    const to = o.direction === "CREDIT" ? link.accountId : other.id;
    const ids = [from, to].sort();
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id IN (${ids[0]},${ids[1]}) AND "userId"=${userId} ORDER BY id FOR NO KEY UPDATE`;
    if (link.transactionId) {
      await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id=${link.transactionId} AND "userId"=${userId} FOR NO KEY UPDATE`;
      const old = await tx.financialTransaction.findUniqueOrThrow({
        where: { id: link.transactionId, userId },
        include: {
          goalAllocations: true,
          paymentAllocations: true,
          businessReceiptAllocations: true,
        },
      });
      if (old.type === "TRANSFER") {
        if (old.accountId !== from || old.destinationAccountId !== to)
          throw new FinanceError(
            "This transfer already has an observed account relationship.",
          );
        if (link.status === "PROJECTED") return { id: old.id };
      }
      if (old.amountMinor !== o.amountMinor || old.currency !== o.currency)
        throw new FinanceError(
          "Resolve the evidence correction before changing this event into a transfer.",
        );
      if (
        old.goalAllocations.length ||
        old.paymentAllocations.length ||
        old.businessReceiptAllocations.length ||
        old.recurringExpenseOccurrenceId
      )
        throw new FinanceError(
          "Correct allocations before changing this event into a transfer.",
        );
    }
    const matches = await tx.financialTransaction.findMany({
      where: {
        userId,
        type: "TRANSFER",
        accountId: from,
        destinationAccountId: to,
        currency: o.currency,
        amountMinor: o.amountMinor,
        occurredAt: evidenceWindow(o.activityOn),
        evidenceLinks: {
          none: {
            status: "PROJECTED",
            accountId: link.accountId,
            observation: { bookingStatus: "BOOKED" },
          },
        },
        ...(link.transactionId ? { id: { not: link.transactionId } } : {}),
      },
      take: 2,
    });
    if (matches.length > 1)
      throw new FinanceError(
        "Several transfers match. Resolve this overlap individually.",
      );
    if (matches.length && link.transactionId)
      throw new FinanceError(
        "This movement already has an event. Resolve it as overlapping evidence of the existing transfer.",
      );
    const event =
      matches[0] ??
      (link.transactionId
        ? await tx.financialTransaction.update({
            where: { id: link.transactionId, userId },
            data: {
              type: "TRANSFER",
              accountId: from,
              destinationAccountId: to,
              inflowKind: null,
              counterpartyId: null,
              expenseCategoryId: null,
              reviewedAt: null,
            },
          })
        : await tx.financialTransaction.create({
            data: {
              userId,
              type: "TRANSFER",
              accountId: from,
              destinationAccountId: to,
              currency: o.currency,
              amountMinor: o.amountMinor,
              occurredAt: o.occurredAt,
              activityOn: o.activityOn,
              dataSource: o.source,
              reviewedAt: null,
            },
          }));
    await tx.financialEvidenceLink.update({
      where: { id: link.id, userId },
      data: {
        status: "PROJECTED",
        transactionId: event.id,
        needsAttention: null,
        duplicateCandidates: [],
        resolvedAt: new Date(),
      },
    });
    return { id: event.id };
  });
}

export async function classifyIncomingEvidence(
  userId: string,
  observationId: string,
  inflowKind: "REFUND" | "OTHER",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const link = await tx.financialEvidenceLink.findFirst({
      where: { userId, observationId },
      include: {
        account: true,
        observation: { include: { statementImport: true } },
      },
    });
    if (
      !link?.accountId ||
      link.observation.bookingStatus !== "BOOKED" ||
      link.observation.direction !== "CREDIT"
    )
      throw new FinanceError("Choose an owned booked incoming movement.");
    if (link.transactionId || link.status !== "STAGED")
      throw new FinanceError(
        "This movement is already interpreted or requires overlap review.",
      );
    if (
      link.account?.archivedAt ||
      ["SUPERSEDED", "IGNORED"].includes(link.status) ||
      (link.observation.statementImport &&
        !link.observation.statementImport.confirmedAt)
    )
      throw new FinanceError(
        "Use current confirmed evidence from an active account.",
      );
    const o = link.observation;
    const transaction = await tx.financialTransaction.create({
      data: {
        userId,
        accountId: link.accountId,
        type: "INCOME",
        inflowKind,
        amountMinor: o.amountMinor,
        currency: o.currency,
        occurredAt: o.occurredAt,
        activityOn: o.activityOn,
        dataSource: o.source,
        reviewedAt: null,
      },
    });
    await tx.financialEvidenceLink.update({
      where: { id: link.id, userId },
      data: {
        status: "PROJECTED",
        transactionId: transaction.id,
        needsAttention: null,
        resolvedAt: new Date(),
      },
    });
    return { id: transaction.id };
  });
}
