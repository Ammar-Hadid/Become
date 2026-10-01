import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getRecurringSuggestions } from "@/features/finance/recurring/queries/recurring-suggestions.query";
import { FinanceError } from "@/features/finance/types/finance.types";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  recurringDueDates,
  storedDay,
} from "@/features/finance/recurring/utils/recurring-calendar.util";

export async function confirmRecurringSuggestion(userId: string, key: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    // Serialize confirmation per user; suggestions are re-derived from trusted facts.
    await tx.$queryRaw`SELECT id FROM "user" WHERE id=${userId} FOR NO KEY UPDATE`;
    const suggestion = (await getRecurringSuggestions(userId, tx)).find(
      (item) => item.key === key,
    );
    if (!suggestion)
      throw new FinanceError(
        "This suggestion changed or has already been confirmed.",
      );
    const today = DateTime.now().setZone(APP_TIMEZONE).startOf("day");
    const start = DateTime.fromISO(suggestion.nextDueOn, {
      zone: APP_TIMEZONE,
    });
    const future = recurringDueDates(
      { ...suggestion, startOn: storedDay(start), endOn: null },
      DateTime.max(start, today),
      today.plus({ years: 1 }),
    )[0];
    const nextDueOn = future?.toISODate() ?? suggestion.nextDueOn;
    if (suggestion.type === "INCOME") {
      const result = await tx.financeExpectedIncome.create({
        data: {
          userId,
          accountId: suggestion.accountId,
          title: suggestion.name,
          counterpartyId: suggestion.counterpartyId,
          currency: suggestion.currency,
          amountMinor: suggestion.amountMinor,
          dueOn: nextDueOn,
          anchorDate:
            suggestion.frequency === "WEEKLY"
              ? suggestion.lastActivityOn
              : `2000-${String(suggestion.monthOfYear ?? 1).padStart(2, "0")}-${String(suggestion.dayOfMonth ?? 1).padStart(2, "0")}`,
          recurrenceFrequency: suggestion.frequency,
        },
      });
      return { id: result.id };
    }
    const result = await tx.recurringExpense.create({
      data: {
        userId,
        accountId: suggestion.accountId,
        counterpartyId: suggestion.counterpartyId,
        expenseCategoryId: suggestion.expenseCategoryId,
        name: suggestion.name,
        amountMinor: suggestion.amountMinor,
        currency: suggestion.currency,
        frequency: suggestion.frequency,
        dayOfWeek: suggestion.dayOfWeek,
        dayOfMonth: suggestion.dayOfMonth,
        monthOfYear: suggestion.monthOfYear,
        startOn: new Date(`${nextDueOn}T00:00:00Z`),
        processedThroughOn: storedDay(today.minus({ days: 1 })),
        postingBehavior: "ASK_TO_CONFIRM",
      },
    });
    return { id: result.id };
  });
}
