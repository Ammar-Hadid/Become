import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { seasonCalendar } from "./season-calendar.util";
import { measurementWindow } from "@/features/direction/measurements/utils/measurement-window.util";
describe("season calendar and independent horizons", () => {
  it("opens the actual 92-day season mid-quarter", () => {
    const r = seasonCalendar(
      2026,
      3,
      DateTime.fromISO("2026-09-09T12:00", { zone: "Europe/Amsterdam" }),
    );
    expect(r).toMatchObject({
      dayNumber: 71,
      totalDays: 92,
      daysAfterToday: 21,
      endOn: "2026-09-30",
    });
  });
  it("uses the highest applicable cue and ends without a closing ritual", () => {
    expect(seasonCalendar(2026, 3, DateTime.fromISO("2026-09-17")).phase).toBe(
      "FINAL_14",
    );
    expect(seasonCalendar(2026, 3, DateTime.fromISO("2026-09-24")).phase).toBe(
      "FINAL_7",
    );
    expect(seasonCalendar(2026, 3, DateTime.fromISO("2026-09-28")).phase).toBe(
      "FINAL_3",
    );
    expect(seasonCalendar(2026, 3, DateTime.fromISO("2026-10-01")).phase).toBe(
      "ENDED",
    );
  });
  it("clips receipt dates to an inclusive calendar window across DST", () => {
    const r = measurementWindow(
      {
        key: "a",
        metric: "WORK_SOURCE_INCOME",
        label: "Outlier",
        target: "1000",
        currency: "EUR",
        startOn: "2026-09-09",
        endOn: "2026-12-07",
      },
      { startOn: "2026-09-09" },
      new Date("2027-01-01"),
    );
    expect(r.start.toISOString()).toBe("2026-09-08T22:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-12-07T23:00:00.000Z");
    expect((r.end.getTime() - r.start.getTime()) / 3600000).toBe(2161);
  });
  it("permits an open-ended future horizon while querying no future evidence", () => {
    const r = measurementWindow(
      { key: "later", metric: "MANUAL", label: "Later", target: "" },
      { startOn: "2027-01-01" },
      new Date("2026-09-09T12:00:00Z"),
    );
    expect(r.start.toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(r.end < r.start).toBe(true);
  });
});
