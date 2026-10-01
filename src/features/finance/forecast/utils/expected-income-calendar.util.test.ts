import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { expectedIncomeDueDates } from "./expected-income-calendar.util";
const day = (value: string) =>
  DateTime.fromISO(value, { zone: "Europe/Amsterdam" });
describe("expected-income calendar", () => {
  it("retains a confirmed month-end anchor across February", () => {
    expect(
      expectedIncomeDueDates(
        {
          dueOn: "2026-02-28",
          anchorDate: "2000-01-31",
          recurrenceFrequency: "MONTHLY",
        },
        day("2026-02-01"),
        day("2026-04-30"),
      ).map((date) => date.toISODate()),
    ).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("does not project a past one-off receipt", () => {
    expect(
      expectedIncomeDueDates(
        { dueOn: "2026-01-01", anchorDate: null, recurrenceFrequency: null },
        day("2026-02-01"),
        day("2026-04-30"),
      ),
    ).toEqual([]);
  });
});
