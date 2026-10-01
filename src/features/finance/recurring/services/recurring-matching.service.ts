import { matchImportedExpectedIncomeTransaction } from "@/features/finance/forecast/services/expected-income-matching.service";
import { DateTime } from "luxon";
import type {
  Prisma,
  RecurringExpenseOccurrence,
} from "@/generated/prisma/client";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { FinanceError } from "@/features/finance/types/finance.types";
import {
  localDay,
  recurringDueDates,
  storedDay,
} from "@/features/finance/recurring/utils/recurring-calendar.util";

// This annotates an existing ledger fact. It never synthesizes a second payment.
export async function matchRecurringOccurrence(
  tx: Prisma.TransactionClient,
  occurrence: RecurringExpenseOccurrence,
) {
  if (
    occurrence.status !== "AWAITING_CONFIRMATION" ||
    !occurrence.counterpartyId
  )
    return false;
  const due = localDay(occurrence.dueOn);
  const from = due.minus({ days: 3 });
  const through = due.plus({ days: 3 });
  const candidates = await tx.financialTransaction.findMany({
    where: {
      userId: occurrence.userId,
      accountId: occurrence.accountId,
      type: "EXPENSE",
      currency: occurrence.currency,
      amountMinor: occurrence.scheduledAmountMinor,
      counterpartyId: occurrence.counterpartyId,
      recurringExpenseOccurrenceId: null,
      OR: [
        { activityOn: { gte: from.toISODate()!, lte: through.toISODate()! } },
        {
          activityOn: null,
          occurredAt: {
            gte: from.toUTC().toJSDate(),
            lt: through.plus({ days: 1 }).toUTC().toJSDate(),
          },
        },
      ],
    },
    select: { id: true },
    take: 2,
  });
  if (candidates.length !== 1) return false;
  await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id = ${candidates[0].id} AND "userId" = ${occurrence.userId} FOR NO KEY UPDATE`;
  const fact = await tx.financialTransaction.findFirst({
    where: {
      id: candidates[0].id,
      userId: occurrence.userId,
      recurringExpenseOccurrenceId: null,
    },
  });
  if (!fact) return false;
  const definitions = await tx.recurringExpense.findMany({
    where: {
      userId: occurrence.userId,
      accountId: occurrence.accountId,
      currency: occurrence.currency,
      amountMinor: occurrence.scheduledAmountMinor,
      counterpartyId: occurrence.counterpartyId,
      archivedAt: null,
      status: "ACTIVE",
    },
  });
  const plausible = definitions.flatMap((definition) =>
    recurringDueDates(definition, from, through).map((dueOn) => ({
      definition,
      dueOn,
    })),
  );
  // Equal subscriptions to the same merchant must remain a human decision.
  if (
    plausible.length !== 1 ||
    plausible[0].definition.id !== occurrence.recurringExpenseId
  )
    return false;
  await tx.financialTransaction.update({
    where: { id: fact.id, userId: occurrence.userId },
    data: { recurringExpenseOccurrenceId: occurrence.id },
  });
  await tx.recurringExpenseOccurrence.update({
    where: { id: occurrence.id, userId: occurrence.userId },
    data: { status: "POSTED_CONFIRMED", resolvedAt: new Date() },
  });
  return true;
}

export async function matchImportedRecurringTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
) {
  await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id = ${transactionId} AND "userId" = ${userId} FOR NO KEY UPDATE`;
  const fact = await tx.financialTransaction.findFirst({
    where: { id: transactionId, userId },
    include: { account: true },
  });
  if (fact?.type === "INCOME")
    return matchImportedExpectedIncomeTransaction(tx, userId, transactionId);
  if (
    !fact ||
    fact.type !== "EXPENSE" ||
    fact.recurringExpenseOccurrenceId ||
    !fact.counterpartyId ||
    fact.account.dataSource === "MANUAL"
  )
    return false;
  const on = DateTime.fromISO(
    fact.activityOn ??
      DateTime.fromJSDate(fact.occurredAt).setZone(APP_TIMEZONE).toISODate()!,
    { zone: APP_TIMEZONE },
  );
  const definitions = await tx.recurringExpense.findMany({
    where: {
      userId,
      accountId: fact.accountId,
      currency: fact.currency,
      counterpartyId: fact.counterpartyId,
      amountMinor: fact.amountMinor,
      status: "ACTIVE",
      archivedAt: null,
    },
  });
  const matches = definitions.flatMap((definition) =>
    recurringDueDates(
      definition,
      on.minus({ days: 3 }),
      on.plus({ days: 3 }),
    ).map((due) => ({ definition, due })),
  );
  if (matches.length !== 1) return false;
  const { definition, due } = matches[0];
  const occurrence = await tx.recurringExpenseOccurrence.upsert({
    where: {
      recurringExpenseId_dueOn: {
        recurringExpenseId: definition.id,
        dueOn: storedDay(due),
      },
    },
    update: {},
    create: {
      userId,
      recurringExpenseId: definition.id,
      dueOn: storedDay(due),
      nameSnapshot: definition.name,
      scheduledAmountMinor: definition.amountMinor,
      currency: definition.currency,
      accountId: definition.accountId,
      expenseCategoryId: definition.expenseCategoryId,
      counterpartyId: definition.counterpartyId,
      postingBehaviorSnapshot: definition.postingBehavior,
      status: "AWAITING_CONFIRMATION",
    },
  });
  return matchRecurringOccurrence(tx, occurrence);
}

export async function linkRecurringTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  occurrenceId: string,
  transactionId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
  await tx.$queryRaw`SELECT id FROM recurring_expense_occurrence WHERE id = ${occurrenceId} AND "userId" = ${userId} FOR NO KEY UPDATE`;
  await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id = ${transactionId} AND "userId" = ${userId} FOR NO KEY UPDATE`;
  const [occurrence, fact] = await Promise.all([
    tx.recurringExpenseOccurrence.findFirst({
      where: { id: occurrenceId, userId },
    }),
    tx.financialTransaction.findFirst({ where: { id: transactionId, userId } }),
  ]);
  if (!occurrence || !fact)
    throw new FinanceError("Occurrence or transaction unavailable.");
  if (fact.recurringExpenseOccurrenceId === occurrence.id) return;
  if (
    occurrence.status !== "AWAITING_CONFIRMATION" ||
    fact.recurringExpenseOccurrenceId ||
    fact.type !== "EXPENSE" ||
    fact.currency !== occurrence.currency ||
    fact.accountId !== occurrence.accountId
  )
    throw new FinanceError(
      "Choose an unlinked expense in this account and currency.",
    );
  await tx.financialTransaction.update({
    where: { id: fact.id, userId },
    data: { recurringExpenseOccurrenceId: occurrence.id },
  });
  await tx.recurringExpenseOccurrence.update({
    where: { id: occurrence.id, userId },
    data: { status: "POSTED_CONFIRMED", resolvedAt: new Date() },
  });
}
