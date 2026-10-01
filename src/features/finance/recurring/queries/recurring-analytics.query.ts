import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getRecurringSuggestions } from "@/features/finance/recurring/queries/recurring-suggestions.query";
import { getPeriod } from "@/lib/dates/utils/period.util";
import {
  annualizedRecurringAmount,
  financeToday,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
export async function getRecurringAnalytics(userId: string) {
  const today = financeToday();
  const month = getPeriod(today, "month");
  const [definitions, awaiting, actual] = await Promise.all([
    prisma.recurringExpense.findMany({
      where: { userId, archivedAt: null },
      include: { expenseCategory: true },
      orderBy: [{ amountMinor: "desc" }, { id: "asc" }],
    }),
    prisma.recurringExpenseOccurrence.count({
      where: { userId, status: "AWAITING_CONFIRMATION" },
    }),
    prisma.financialTransaction.groupBy({
      by: ["currency", "recurringExpenseOccurrenceId"],
      where: {
        userId,
        type: "EXPENSE",
        occurredAt: {
          gte: month.start.toUTC().toJSDate(),
          lt: month.end.toUTC().toJSDate(),
        },
      },
      _sum: { amountMinor: true },
    }),
  ]);
  const current = definitions.filter(
    (definition) =>
      definition.status === "ACTIVE" &&
      (!definition.endOn ||
        definition.endOn.toISOString().slice(0, 10) >= today.toISODate()!),
  );
  const actualByCurrency = new Map<
    string,
    { recurring: bigint; ordinary: bigint }
  >();
  for (const row of actual) {
    const totals = actualByCurrency.get(row.currency) ?? {
      recurring: 0n,
      ordinary: 0n,
    };
    totals[row.recurringExpenseOccurrenceId ? "recurring" : "ordinary"] +=
      row._sum.amountMinor ?? 0n;
    actualByCurrency.set(row.currency, totals);
  }
  const categoryAnnualized = new Map<
    string,
    { currency: string; category: string; amount: bigint }
  >();
  for (const definition of current.filter((definition) => !definition.endOn)) {
    const annualized = annualizedRecurringAmount(
      definition.amountMinor,
      definition,
    );
    if (annualized === null) continue;
    const category = definition.expenseCategory?.name ?? "Uncategorized";
    const key = `${definition.currency}:${category}`;
    const row = categoryAnnualized.get(key) ?? {
      currency: definition.currency,
      category,
      amount: 0n,
    };
    row.amount += annualized;
    categoryAnnualized.set(key, row);
  }
  return {
    active: current.length,
    automatic: current.filter(
      (definition) => definition.postingBehavior === "AUTOMATIC",
    ).length,
    paused: definitions.filter((definition) => definition.status === "PAUSED")
      .length,
    awaiting,
    actualByCurrency,
    categoryAnnualized: [...categoryAnnualized.values()],
    largest: [...new Set(current.map((definition) => definition.currency))]
      .sort()
      .flatMap((currency) =>
        current
          .filter((definition) => definition.currency === currency)
          .slice(0, 5),
      ),
    monthLabel: month.label,
    suggestions: await getRecurringSuggestions(userId),
  };
}
