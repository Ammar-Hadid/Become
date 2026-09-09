import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { lockFinancialTransaction } from "@/features/finance/transactions/services/financial-transaction.service";
import { parseMoney } from "@/lib/money/utils/money.util";
export async function replacePaymentAllocations(
  userId: string,
  transactionId: string,
  entries: { sessionId: string; amount: string }[],
  completeness: "yes" | "no" | "unsure",
) {
  if (
    entries.length > 200 ||
    new Set(entries.map((entry) => entry.sessionId)).size !== entries.length
  )
    throw new FinanceError("Select each work session once (at most 200).");
  await prisma.$transaction(async (tx) => {
    await lockFinancialTransaction(tx, userId, transactionId);
    const payment = await tx.financialTransaction.findUniqueOrThrow({
      where: { id: transactionId, userId },
      include: { paymentAllocations: true },
    });
    if (payment.type !== "INCOME" || payment.inflowKind !== "EARNED_WORK")
      throw new FinanceError(
        "Only earned-work income can be allocated to work sessions.",
      );
    const affected = [
      ...new Set([
        ...entries.map((entry) => entry.sessionId),
        ...payment.paymentAllocations.map((allocation) => allocation.sessionId),
      ]),
    ].sort();
    if (affected.length)
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM session WHERE "userId" = ${userId} AND id IN (${Prisma.join(affected)}) ORDER BY id FOR UPDATE`,
      );
    const sessions = await tx.session.findMany({
      where: {
        userId,
        id: { in: entries.map((entry) => entry.sessionId) },
        endedAt: { not: null },
        financeActivityKind: "PAID_WORK",
        domain: { slug: "finance" },
      },
    });
    if (sessions.length !== entries.length)
      throw new FinanceError(
        "Allocations require your completed Finance Paid Work sessions.",
      );
    const allocations = entries.map((entry) => {
      let amountMinor: bigint;
      try {
        amountMinor = parseMoney(entry.amount, payment.currency);
      } catch (error) {
        throw new FinanceError((error as Error).message);
      }
      if (amountMinor <= 0n)
        throw new FinanceError(
          "Each payment allocation must be greater than zero.",
        );
      return { userId, transactionId, sessionId: entry.sessionId, amountMinor };
    });
    if (
      allocations.reduce(
        (sum, allocation) => sum + allocation.amountMinor,
        0n,
      ) > payment.amountMinor
    )
      throw new FinanceError("Allocations exceed the payment amount.");
    await tx.paymentSessionAllocation.deleteMany({
      where: { userId, transactionId },
    });
    if (allocations.length)
      await tx.paymentSessionAllocation.createMany({ data: allocations });
    if (affected.length)
      await tx.session.updateMany({
        where: { userId, id: { in: affected } },
        data: { paymentAttributionCompleteAt: null },
      });
    if (completeness === "yes")
      await tx.session.updateMany({
        where: { userId, id: { in: entries.map((entry) => entry.sessionId) } },
        data: { paymentAttributionCompleteAt: new Date() },
      });
  });
}
