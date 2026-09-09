import { DateTime } from "luxon";
import { expect, it } from "vitest";
import {
  annualizedRecurringAmount,
  recurringDueDates,
  type RecurringSchedule,
} from "./recurring-calendar.util";
const date = (s: string) => DateTime.fromISO(s, { zone: "Europe/Amsterdam" });
const schedule: RecurringSchedule = {
  frequency: "MONTHLY",
  dayOfWeek: null,
  dayOfMonth: 31,
  monthOfYear: null,
  startOn: new Date("2024-01-01Z"),
  endOn: null,
};
it.each([
  ["WEEKLY", 52n],
  ["MONTHLY", 12n],
  ["YEARLY", 1n],
] as const)("annualizes %s schedules", (frequency, occurrences) => {
  expect(annualizedRecurringAmount(3_349n, { frequency })).toBe(
    3_349n * occurrences,
  );
});
it("declines to annualize an unsupported schedule", () => {
  expect(annualizedRecurringAmount(3_349n, { frequency: "CUSTOM" })).toBeNull();
});
it.each([29, 30, 31])("clamps %s and preserves its anchor", (dayOfMonth) => {
  expect(
    recurringDueDates(
      { ...schedule, dayOfMonth },
      date("2025-01-01"),
      date("2025-03-31"),
    ).map((d) => d.toISODate()),
  ).toEqual([`2025-01-${dayOfMonth}`, "2025-02-28", `2025-03-${dayOfMonth}`]);
});
it("returns leap day after a clamped nonleap year", () => {
  const yearly = {
    ...schedule,
    frequency: "YEARLY" as const,
    dayOfMonth: 29,
    monthOfYear: 2,
  };
  expect(
    recurringDueDates(yearly, date("2027-01-01"), date("2028-12-31")).map((d) =>
      d.toISODate(),
    ),
  ).toEqual(["2027-02-28", "2028-02-29"]);
});
it("keeps weekdays and local midnight across DST and respects inclusive end", () => {
  const weekly = {
    ...schedule,
    frequency: "WEEKLY" as const,
    dayOfWeek: 7,
    dayOfMonth: null,
    endOn: new Date("2026-04-05Z"),
  };
  const dates = recurringDueDates(
    weekly,
    date("2026-03-22"),
    date("2026-04-30"),
  );
  expect(dates.map((d) => d.toISODate())).toEqual([
    "2026-03-22",
    "2026-03-29",
    "2026-04-05",
  ]);
  expect(dates.map((d) => d.hour)).toEqual([0, 0, 0]);
  expect(dates[2].diff(dates[1], "hours").hours).toBe(167);
});
