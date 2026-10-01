import { DateTime } from "luxon";
import type { Prisma } from "@/generated/prisma/client";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { FinanceError } from "@/features/finance/types/finance.types";
import { expectedIncomeDueDates } from "@/features/finance/forecast/utils/expected-income-calendar.util";

export async function matchImportedExpectedIncomeTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
) {
  await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id=${transactionId} AND "userId"=${userId} FOR NO KEY UPDATE`;
  const fact = await tx.financialTransaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (
    !fact ||
    fact.type !== "INCOME" ||
    fact.expectedIncomeId ||
    !fact.counterpartyId
  )
    return false;
  const on = DateTime.fromISO(
    fact.activityOn ??
      DateTime.fromJSDate(fact.occurredAt).setZone(APP_TIMEZONE).toISODate()!,
    { zone: APP_TIMEZONE },
  );
  const expectations = await tx.financeExpectedIncome.findMany({
    where: {
      userId,
      accountId: fact.accountId,
      currency: fact.currency,
      amountMinor: fact.amountMinor,
      counterpartyId: fact.counterpartyId,
      archivedAt: null,
    },
  });
  const matches = expectations.flatMap((income) =>
    expectedIncomeDueDates(
      income,
      on.minus({ days: 3 }),
      on.plus({ days: 3 }),
    ).map((due) => ({ income, dueOn: due.toISODate()! })),
  );
  if (matches.length !== 1) return false;
  const { income, dueOn } = matches[0];
  await tx.$queryRaw`SELECT id FROM finance_expected_income WHERE id=${income.id} AND "userId"=${userId} FOR NO KEY UPDATE`;
  if (
    await tx.financialTransaction.findFirst({
      where: {
        userId,
        expectedIncomeId: income.id,
        expectedIncomeDueOn: dueOn,
      },
    })
  )
    return false;
  await tx.financialTransaction.update({
    where: { id: fact.id, userId },
    data: { expectedIncomeId: income.id, expectedIncomeDueOn: dueOn },
  });
  return true;
}

export async function linkExpectedIncomeTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  expectedIncomeId: string,
  transactionId: string,
  dueOn: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
  await tx.$queryRaw`SELECT id FROM financial_transaction WHERE id=${transactionId} AND "userId"=${userId} FOR NO KEY UPDATE`;
  await tx.$queryRaw`SELECT id FROM finance_expected_income WHERE id=${expectedIncomeId} AND "userId"=${userId} FOR NO KEY UPDATE`;
  const [income, fact] = await Promise.all([
    tx.financeExpectedIncome.findFirst({
      where: { id: expectedIncomeId, userId, archivedAt: null },
    }),
    tx.financialTransaction.findFirst({ where: { id: transactionId, userId } }),
  ]);
  const date = DateTime.fromISO(dueOn, { zone: APP_TIMEZONE });
  if (
    !income ||
    !fact ||
    !date.isValid ||
    !expectedIncomeDueDates(income, date, date).length
  )
    throw new FinanceError(
      "Expected income occurrence or transaction is unavailable.",
    );
  if (
    fact.expectedIncomeId === expectedIncomeId &&
    fact.expectedIncomeDueOn === dueOn
  )
    return;
  if (
    fact.type !== "INCOME" ||
    fact.expectedIncomeId ||
    fact.accountId !== income.accountId ||
    fact.currency !== income.currency
  )
    throw new FinanceError(
      "Choose an unlinked incoming transaction in this account and currency.",
    );
  if (
    await tx.financialTransaction.findFirst({
      where: { userId, expectedIncomeId, expectedIncomeDueOn: dueOn },
    })
  )
    throw new FinanceError(
      "This expected income occurrence already has a recorded transaction.",
    );
  await tx.financialTransaction.update({
    where: { id: fact.id, userId },
    data: { expectedIncomeId, expectedIncomeDueOn: dueOn },
  });
}
