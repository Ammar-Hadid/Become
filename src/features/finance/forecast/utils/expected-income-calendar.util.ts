import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { recurringDueDates } from "@/features/finance/recurring/utils/recurring-calendar.util";
export type ExpectedIncomeSchedule = {
  dueOn: string;
  anchorDate: string | null;
  recurrenceFrequency: "WEEKLY" | "MONTHLY" | "YEARLY" | null;
};
export function expectedIncomeDueDates(
  income: ExpectedIncomeSchedule,
  from: DateTime,
  through: DateTime,
) {
  const anchor = DateTime.fromISO(income.anchorDate ?? income.dueOn, {
    zone: APP_TIMEZONE,
  });
  return income.recurrenceFrequency
    ? recurringDueDates(
        {
          frequency: income.recurrenceFrequency,
          dayOfWeek: anchor.weekday,
          dayOfMonth: anchor.day,
          monthOfYear: anchor.month,
          startOn: new Date(`${income.dueOn}T00:00:00Z`),
          endOn: null,
        },
        from,
        through,
      )
    : [DateTime.fromISO(income.dueOn, { zone: APP_TIMEZONE })].filter(
        (date) => date >= from && date <= through,
      );
}
