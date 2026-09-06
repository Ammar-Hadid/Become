import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
export type RecurringSchedule = {
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startOn: Date;
  endOn: Date | null;
};
export const localDay = (value: Date) =>
  DateTime.fromISO(value.toISOString().slice(0, 10), { zone: APP_TIMEZONE });
export const storedDay = (value: DateTime) =>
  new Date(`${value.toISODate()}T00:00:00.000Z`);
export const financeToday = (now = new Date()) =>
  DateTime.fromJSDate(now).setZone(APP_TIMEZONE).startOf("day");

export function annualizedRecurringAmount(
  amountMinor: bigint,
  schedule: Pick<RecurringSchedule, "frequency"> | { frequency: string },
): bigint | null {
  switch (schedule.frequency) {
    case "WEEKLY":
      return amountMinor * 52n;
    case "MONTHLY":
      return amountMinor * 12n;
    case "YEARLY":
      return amountMinor;
    default:
      return null;
  }
}

// Dates are local calendar dates; recurrence anchors never drift after clamping.
export function recurringDueDates(
  schedule: RecurringSchedule,
  from: DateTime,
  through: DateTime,
): DateTime[] {
  const start = DateTime.max(from.startOf("day"), localDay(schedule.startOn));
  const end = schedule.endOn
    ? DateTime.min(through.startOf("day"), localDay(schedule.endOn))
    : through.startOf("day");
  if (start > end) return [];
  const dates: DateTime[] = [];
  if (schedule.frequency === "WEEKLY") {
    let due = start.plus({
      days: ((schedule.dayOfWeek ?? 1) - start.weekday + 7) % 7,
    });
    while (due <= end) {
      dates.push(due);
      due = due.plus({ weeks: 1 });
    }
  } else {
    let period = start.startOf(
      schedule.frequency === "MONTHLY" ? "month" : "year",
    );
    while (period <= end) {
      const month =
        schedule.frequency === "YEARLY"
          ? period.set({ month: schedule.monthOfYear ?? 1 })
          : period;
      const due = month.set({
        day: Math.min(schedule.dayOfMonth ?? 1, month.daysInMonth!),
      });
      if (due >= start && due <= end) dates.push(due);
      period = period.plus(
        schedule.frequency === "MONTHLY" ? { months: 1 } : { years: 1 },
      );
    }
  }
  return dates;
}
