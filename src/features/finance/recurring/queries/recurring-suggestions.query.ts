import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { detectRecurringSuggestions } from "@/features/finance/recurring/utils/recurring-detection.util";
import type { RecurringObservation } from "@/features/finance/recurring/types/recurring-detection.types";

export async function getRecurringSuggestions(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
) {
  const rows = await tx.$queryRaw<RecurringObservation[]>`
    WITH recent AS (
      SELECT t.id, t."accountId", t.currency, t.type, t."amountMinor",
        COALESCE(t."activityOn", (t."occurredAt" AT TIME ZONE ${APP_TIMEZONE})::date::text) AS "activityOn",
        t."counterpartyId", c.name AS "counterpartyName", t."expenseCategoryId",
        ROW_NUMBER() OVER (PARTITION BY t."accountId", t.currency, t.type, t."counterpartyId" ORDER BY t."occurredAt" DESC, t.id DESC) AS number
      FROM financial_transaction t
      JOIN financial_account a ON a.id=t."accountId" AND a."userId"=t."userId"
      JOIN counterparty c ON c.id=t."counterpartyId" AND c."userId"=t."userId"
      WHERE t."userId"=${userId} AND t.type IN ('INCOME','EXPENSE') AND t."reviewedAt" IS NOT NULL
        AND a."archivedAt" IS NULL AND c."archivedAt" IS NULL
    ) SELECT id, "accountId", currency, type, "amountMinor", "activityOn", "counterpartyId", "counterpartyName", "expenseCategoryId"
      FROM recent WHERE number <= 6`;
  const suggestions = detectRecurringSuggestions(rows);
  const [expenses, incomes] = await Promise.all([
    tx.recurringExpense.findMany({
      where: { userId, archivedAt: null },
      select: { accountId: true, counterpartyId: true },
    }),
    tx.financeExpectedIncome.findMany({
      where: { userId, archivedAt: null, recurrenceFrequency: { not: null } },
      select: { accountId: true, title: true },
    }),
  ]);
  return suggestions.filter((suggestion) =>
    suggestion.type === "EXPENSE"
      ? !expenses.some(
          (expense) =>
            expense.accountId === suggestion.accountId &&
            expense.counterpartyId === suggestion.counterpartyId,
        )
      : !incomes.some(
          (income) =>
            income.accountId === suggestion.accountId &&
            income.title === suggestion.name,
        ),
  );
}
