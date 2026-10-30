import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export type LedgerFilters = {
  cursor?: string;
  type?: string;
  currency?: string;
  account?: string;
  counterparty?: string;
  period?: string;
  date?: string;
};

/** Calendar-day filters use the same zone as the dates displayed in the ledger. */
export function ledgerDateRange(
  filters: Pick<LedgerFilters, "date" | "period">,
  now: DateTime = DateTime.now(),
) {
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    const day = DateTime.fromISO(filters.date, { zone: APP_TIMEZONE });
    if (day.isValid)
      return {
        gte: day.startOf("day").toUTC().toJSDate(),
        lt: day.plus({ days: 1 }).startOf("day").toUTC().toJSDate(),
      };
  }
  const end = now.setZone(APP_TIMEZONE).plus({ days: 1 }).startOf("day");
  const days: Record<string, number> = { "1D": 1, "7D": 7 };
  const months: Record<string, number> = { "1M": 1, "3M": 3, "1Y": 12 };
  const period = filters.period ?? "ALL";
  const start = days[period]
    ? end.minus({ days: days[period] })
    : months[period]
      ? end.minus({ months: months[period] })
      : null;
  return start
    ? { gte: start.toUTC().toJSDate(), lt: end.toUTC().toJSDate() }
    : undefined;
}
