import { DateTime } from "luxon";
import type {
  RecurringObservation,
  RecurringSuggestion,
} from "@/features/finance/recurring/types/recurring-detection.types";

const absolute = (value: bigint) => (value < 0n ? -value : value);

// A suggestion is evidence of repetition, never a confirmed future commitment.
export function detectRecurringSuggestions(
  observations: RecurringObservation[],
): RecurringSuggestion[] {
  const groups = new Map<string, RecurringObservation[]>();
  for (const observation of observations) {
    if (
      observation.amountMinor <= 0n ||
      !DateTime.fromISO(observation.activityOn).isValid
    )
      continue;
    const key = `${observation.accountId}:${observation.currency}:${observation.type}:${observation.counterpartyId}`;
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }
  const suggestions: RecurringSuggestion[] = [];
  for (const [key, all] of groups) {
    const sorted = all.toSorted(
      (a, b) =>
        a.activityOn.localeCompare(b.activityOn) || a.id.localeCompare(b.id),
    );
    // Evaluate the most recent consecutive observations so an old pattern cannot
    // override a new payment cadence. Duplicate same-day purchases disqualify it.
    const rows = sorted.slice(-6);
    if (rows.length < 3) continue;
    const amounts = rows
      .map((row) => row.amountMinor)
      .toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const amountMinor = amounts[Math.floor(amounts.length / 2)];
    if (
      rows.some(
        (row) =>
          absolute(row.amountMinor - amountMinor) * 100n > amountMinor * 10n,
      )
    )
      continue;
    const days = rows.map((row) =>
      DateTime.fromISO(row.activityOn, { zone: "UTC" }),
    );
    const intervals = days
      .slice(1)
      .map((day, index) => day.diff(days[index], "days").days);
    let frequency: RecurringSuggestion["frequency"];
    if (intervals.every((days) => days >= 5 && days <= 9)) frequency = "WEEKLY";
    else if (
      intervals.every((days) => days >= 25 && days <= 35) &&
      days
        .slice(1)
        .every(
          (day, index) =>
            Math.round(
              day.startOf("month").diff(days[index].startOf("month"), "months")
                .months,
            ) === 1,
        )
    )
      frequency = "MONTHLY";
    else if (intervals.every((days) => days >= 355 && days <= 375))
      frequency = "YEARLY";
    else continue;
    const last = rows.at(-1)!;
    const lastDate = days.at(-1)!;
    // Retain the intended end-of-month anchor after a February clamp.
    const dayOfMonth =
      frequency === "WEEKLY" ? null : Math.max(...days.map((day) => day.day));
    const nextPeriod = lastDate.plus(
      frequency === "WEEKLY"
        ? { weeks: 1 }
        : frequency === "MONTHLY"
          ? { months: 1 }
          : { years: 1 },
    );
    const nextDue =
      frequency === "WEEKLY"
        ? nextPeriod
        : nextPeriod.set({
            day: Math.min(dayOfMonth!, nextPeriod.daysInMonth!),
          });
    suggestions.push({
      key,
      name: last.counterpartyName,
      accountId: last.accountId,
      currency: last.currency,
      type: last.type,
      counterpartyId: last.counterpartyId,
      expenseCategoryId: last.expenseCategoryId,
      amountMinor,
      frequency,
      dayOfWeek: frequency === "WEEKLY" ? lastDate.weekday : null,
      dayOfMonth,
      monthOfYear: frequency === "YEARLY" ? lastDate.month : null,
      lastActivityOn: last.activityOn,
      nextDueOn: nextDue.toISODate()!,
      observationIds: rows.map((row) => row.id),
    });
  }
  return suggestions.toSorted(
    (a, b) =>
      a.nextDueOn.localeCompare(b.nextDueOn) || a.key.localeCompare(b.key),
  );
}
