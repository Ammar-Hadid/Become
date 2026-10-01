import { DateTime } from "luxon";
import type { Prisma, RecurringExpense } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import {
  financeToday,
  localDay,
  recurringDueDates,
  storedDay,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import { transactionValues } from "@/features/finance/transactions/services/financial-transaction.service";
import { matchRecurringOccurrence } from "@/features/finance/recurring/services/recurring-matching.service";
import { resolveCounterpartyId } from "@/features/finance/counterparties/services/counterparty.service";

export async function lockRecurring(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM recurring_expense WHERE id = ${id} AND "userId" = ${userId} FOR NO KEY UPDATE`;
  if (!rows.length) throw new FinanceError("Recurring expense not found.");
  return tx.recurringExpense.findUniqueOrThrow({ where: { id, userId } });
}

export async function processRecurringThrough(
  tx: Prisma.TransactionClient,
  definition: RecurringExpense,
  through: DateTime,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${definition.userId + ":finance-evidence"},0))`;
  if (definition.status !== "ACTIVE" || definition.archivedAt) return false;
  const start = localDay(definition.processedThroughOn).plus({ days: 1 });
  if (start > through) return false;
  const batchEnd = DateTime.min(through, start.plus({ days: 61 }));
  const dates = recurringDueDates(definition, start, batchEnd);
  const account = await tx.financialAccount.findFirst({
    where: { id: definition.accountId, userId: definition.userId },
    select: { dataSource: true },
  });
  if (!account) throw new FinanceError("Recurring account is unavailable.");
  const evidenceBacked = account.dataSource !== "MANUAL";
  for (const due of dates) {
    const dueOn = storedDay(due);
    // Existing/reopened occurrences are never automatically posted again.
    const existing = await tx.recurringExpenseOccurrence.findUnique({
      where: {
        recurringExpenseId_dueOn: { recurringExpenseId: definition.id, dueOn },
      },
    });
    if (existing) {
      if (evidenceBacked && existing.status === "AWAITING_CONFIRMATION")
        await matchRecurringOccurrence(tx, existing);
      continue;
    }
    const automatic =
      !evidenceBacked && definition.postingBehavior === "AUTOMATIC";
    const counterpartyId = automatic
      ? (definition.counterpartyId ??
        (await resolveCounterpartyId(tx, definition.userId, {
          name: definition.name,
        })))
      : definition.counterpartyId;
    const occurrence = await tx.recurringExpenseOccurrence.create({
      data: {
        userId: definition.userId,
        recurringExpenseId: definition.id,
        dueOn,
        nameSnapshot: definition.name,
        scheduledAmountMinor: definition.amountMinor,
        currency: definition.currency,
        accountId: definition.accountId,
        expenseCategoryId: definition.expenseCategoryId,
        counterpartyId,
        postingBehaviorSnapshot: definition.postingBehavior,
        status: automatic ? "POSTED_AUTOMATICALLY" : "AWAITING_CONFIRMATION",
        resolvedAt: automatic ? new Date() : null,
      },
    });
    if (evidenceBacked) await matchRecurringOccurrence(tx, occurrence);
    if (automatic) {
      await tx.financialTransaction.create({
        data: {
          userId: definition.userId,
          type: "EXPENSE",
          amountMinor: definition.amountMinor,
          currency: definition.currency,
          accountId: definition.accountId,
          expenseCategoryId: definition.expenseCategoryId,
          occurredAt: due.toUTC().toJSDate(),
          counterpartyId,
          recurringExpenseOccurrenceId: occurrence.id,
        },
      });
    }
  }
  await tx.recurringExpense.update({
    where: { id: definition.id },
    data: { processedThroughOn: storedDay(batchEnd) },
  });
  return batchEnd < through;
}

export async function catchUpRecurring(
  userId: string,
  through = financeToday(),
  onlyId?: string,
) {
  const definitions = await prisma.recurringExpense.findMany({
    where: {
      userId,
      ...(onlyId ? { id: onlyId } : {}),
      status: "ACTIVE",
      archivedAt: null,
      processedThroughOn: { lt: storedDay(through) },
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 20,
  });
  for (const definition of definitions) {
    await prisma.$transaction(
      async (tx) => {
        const locked = await lockRecurring(tx, userId, definition.id);
        await processRecurringThrough(tx, locked, through);
      },
      { timeout: 15000 },
    );
  }
  return {
    more: Boolean(
      await prisma.recurringExpense.findFirst({
        where: {
          userId,
          ...(onlyId ? { id: onlyId } : {}),
          status: "ACTIVE",
          archivedAt: null,
          processedThroughOn: { lt: storedDay(through) },
        },
        select: { id: true },
      }),
    ),
  };
}

export async function catchUpBeforeEdit(userId: string, id: string) {
  const yesterday = financeToday().minus({ days: 1 });
  for (let batch = 0; batch < 1000; batch++) {
    if (!(await catchUpRecurring(userId, yesterday, id)).more) return;
  }
  throw new FinanceError(
    "Historical processing is still catching up. Check due expenses before editing.",
  );
}

export async function resolveRecurringOccurrence(
  userId: string,
  id: string,
  command: "confirm" | "skip",
  input?: unknown,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    await tx.$queryRaw`SELECT id FROM recurring_expense_occurrence WHERE id = ${id} AND "userId" = ${userId} FOR NO KEY UPDATE`;
    const occurrence = await tx.recurringExpenseOccurrence.findFirst({
      where: { id, userId },
    });
    if (!occurrence) throw new FinanceError("Occurrence not found.");
    if (occurrence.status !== "AWAITING_CONFIRMATION") return;
    if (command === "skip") {
      await tx.recurringExpenseOccurrence.update({
        where: { id },
        data: { status: "SKIPPED", resolvedAt: new Date() },
      });
      return;
    }
    const account = await tx.financialAccount.findFirst({
      where: { id: occurrence.accountId, userId },
      select: { dataSource: true },
    });
    if (account?.dataSource !== "MANUAL") {
      const matched = await matchRecurringOccurrence(tx, occurrence);
      if (!matched)
        throw new FinanceError(
          "Await the imported payment or link an existing transaction. This account uses recorded evidence.",
        );
      return;
    }
    const values = await transactionValues(tx, userId, input);
    if (values.type !== "EXPENSE" || values.currency !== occurrence.currency)
      throw new FinanceError("Confirm an expense in the occurrence currency.");
    await tx.financialTransaction.create({
      data: { ...values, recurringExpenseOccurrenceId: id },
    });
    await tx.recurringExpenseOccurrence.update({
      where: { id },
      data: { status: "POSTED_CONFIRMED", resolvedAt: new Date() },
    });
  });
}
