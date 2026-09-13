import {
  calculateSessionDurationWithinPeriod,
  countActiveDaysWithinPeriod,
} from "@/features/sessions/timing/utils/session-duration.util";
import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  formatDuration,
  getPeriod,
  getPreviousPeriod,
  getSeasonForDate,
  percentageChange,
} from "@/lib/dates/utils/period.util";

const zone = "Europe/Amsterdam";

describe("fixed calendar seasons", () => {
  it.each([
    ["2026-01-01", 1],
    ["2026-03-31", 1],
    ["2026-04-01", 2],
    ["2026-09-30", 3],
    ["2026-12-31", 4],
  ])("maps %s to season %i", (isoDate, expectedSeason) => {
    const result = getSeasonForDate(DateTime.fromISO(isoDate, { zone }));
    expect(result.season).toBe(expectedSeason);
    expect(result.year).toBe(2026);
  });

  it("moves to the previous equivalent season across a year boundary", () => {
    const current = getPeriod(
      DateTime.fromISO("2027-01-15", { zone }),
      "season",
    );
    const previous = getPreviousPeriod(current);
    expect(previous.label).toBe("Season 4 · 2026");
    expect(previous.start.toISODate()).toBe("2026-10-01");
  });
});

describe("period boundaries", () => {
  it("uses ISO Monday-based weeks", () => {
    const period = getPeriod(
      DateTime.fromISO("2026-09-03T12:00", { zone }),
      "week",
    );
    expect(period.start.toISODate()).toBe("2026-08-31");
    expect(period.end.toISODate()).toBe("2026-09-07");
  });

  it("clips a session crossing midnight to the requested day", () => {
    const session = {
      pauses: [],
      startedAt: DateTime.fromISO("2026-09-02T23:30", { zone })
        .toUTC()
        .toJSDate(),
      endedAt: DateTime.fromISO("2026-09-03T01:30", { zone })
        .toUTC()
        .toJSDate(),
    };
    const start = DateTime.fromISO("2026-09-03", { zone }).startOf("day");
    const duration = calculateSessionDurationWithinPeriod(
      session,
      { start, end: start.plus({ days: 1 }) },
      DateTime.fromISO("2026-09-03T12:00", { zone }),
    );
    expect(duration).toBe(90 * 60);
  });

  it("measures real elapsed time through the Amsterdam spring DST change", () => {
    const session = {
      pauses: [],
      startedAt: DateTime.fromISO("2026-03-29T01:30", { zone })
        .toUTC()
        .toJSDate(),
      endedAt: DateTime.fromISO("2026-03-29T04:30", { zone })
        .toUTC()
        .toJSDate(),
    };
    const day = DateTime.fromISO("2026-03-29", { zone }).startOf("day");
    expect(
      calculateSessionDurationWithinPeriod(
        session,
        { start: day, end: day.plus({ days: 1 }) },
        day.plus({ days: 1 }),
      ),
    ).toBe(2 * 60 * 60);
  });

  it("caps a running session at now", () => {
    const start = DateTime.fromISO("2026-09-03T10:00", { zone });
    expect(
      calculateSessionDurationWithinPeriod(
        { pauses: [], startedAt: start.toUTC().toJSDate(), endedAt: null },
        {
          start: start.startOf("day"),
          end: start.plus({ days: 1 }).startOf("day"),
        },
        start.plus({ minutes: 25 }),
      ),
    ).toBe(25 * 60);
  });

  it("counts every local day touched by positive session time", () => {
    const period = getPeriod(
      DateTime.fromISO("2026-09-03T12:00", { zone }),
      "week",
    );
    const sessions = [
      {
        pauses: [],
        startedAt: DateTime.fromISO("2026-09-02T23:30", { zone })
          .toUTC()
          .toJSDate(),
        endedAt: DateTime.fromISO("2026-09-03T01:30", { zone })
          .toUTC()
          .toJSDate(),
      },
    ];

    expect(
      countActiveDaysWithinPeriod(
        sessions,
        period,
        DateTime.fromISO("2026-09-04T12:00", { zone }),
      ),
    ).toBe(2);
  });
});

describe("display calculations", () => {
  it("formats duration with tabular-friendly units", () => {
    expect(formatDuration(4 * 3600 + 12 * 60, true)).toBe("4h 12m");
    expect(formatDuration(5)).toBe("00:00:05");
  });

  it("does not imply an infinite comparison when the previous value is zero", () => {
    expect(percentageChange(3600, 0)).toBeNull();
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(4500, 3600)).toBe(25);
  });
});
