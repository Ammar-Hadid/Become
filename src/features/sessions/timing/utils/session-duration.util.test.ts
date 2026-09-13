import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  calculateSessionMilliseconds,
  calculateSessionDurationWithinPeriod,
  countActiveDaysWithinPeriod,
  getSessionTiming,
  type TimedSession,
} from "./session-duration.util";
import { getPeriod } from "@/lib/dates/utils/period.util";

const date = (iso: string) => new Date(iso);
const at = (ms: number) => new Date(Date.UTC(2026, 8, 1) + ms);

describe("focused session time", () => {
  it("does not truncate confirmed timing when a snapshot clock predates its transition", () => {
    const session: TimedSession = {
      startedAt: at(0),
      endedAt: null,
      pauses: [{ startedAt: at(1500), endedAt: null }],
    };
    expect(
      getSessionTiming(session, at(1200).getTime())
        .accumulatedActiveMilliseconds,
    ).toBe(1500);
    session.pauses = [{ startedAt: at(1500), endedAt: at(2500) }];
    expect(getSessionTiming(session, at(1200).getTime())).toMatchObject({
      accumulatedActiveMilliseconds: 1500,
      durationSeconds: 1,
      runningSince: at(2500).toISOString(),
    });
    session.endedAt = at(3500);
    expect(getSessionTiming(session, at(1200).getTime())).toMatchObject({
      accumulatedActiveMilliseconds: 2500,
      durationSeconds: 2,
      totalPausedMilliseconds: 1000,
    });
  });
  it("sums milliseconds before rounding across repeated pauses", () => {
    const session = {
      startedAt: at(0),
      endedAt: at(2500),
      pauses: [
        { startedAt: at(600), endedAt: at(1200) },
        { startedAt: at(1800), endedAt: at(2400) },
      ],
    };
    expect(calculateSessionMilliseconds(session, at(3000).getTime())).toBe(
      1300,
    );
    expect(getSessionTiming(session, at(3000).getTime())).toMatchObject({
      status: "COMPLETED",
      accumulatedActiveMilliseconds: 1300,
      durationSeconds: 1,
      totalPausedMilliseconds: 1200,
      runningSince: null,
    });
  });

  it("keeps an indefinite pause frozen and resumes from the last interval", () => {
    const session: TimedSession = {
      startedAt: at(0),
      endedAt: null,
      pauses: [{ startedAt: at(1234), endedAt: null }],
    };
    expect(
      getSessionTiming(session, at(30 * 86400000).getTime()),
    ).toMatchObject({
      status: "PAUSED",
      accumulatedActiveMilliseconds: 1234,
      durationSeconds: 1,
      runningSince: null,
      pausedAt: at(1234).toISOString(),
    });
    session.pauses = [{ startedAt: at(1234), endedAt: at(10000) }];
    expect(getSessionTiming(session, at(11234).getTime())).toMatchObject({
      status: "RUNNING",
      accumulatedActiveMilliseconds: 1234,
      durationSeconds: 2,
      runningSince: at(10000).toISOString(),
    });
  });

  it("allows immediate pause/end with zero focus and preserves legacy elapsed time", () => {
    expect(
      calculateSessionMilliseconds({
        startedAt: at(0),
        endedAt: at(10000),
        pauses: [{ startedAt: at(0), endedAt: at(10000) }],
      }),
    ).toBe(0);
    expect(
      getSessionTiming({ startedAt: at(0), endedAt: at(10000), pauses: [] })
        .durationSeconds,
    ).toBe(10);
  });

  it.each(["week", "month", "season", "year"] as const)(
    "clips breaks across a %s boundary",
    (timeframe) => {
      const zone = "Europe/Amsterdam";
      const period = getPeriod(
        DateTime.fromISO("2027-01-04T12:00", { zone }),
        timeframe,
      );
      const boundary = period.start.toMillis();
      const session = {
        startedAt: new Date(boundary - 3600000),
        endedAt: new Date(boundary + 3600000),
        pauses: [
          {
            startedAt: new Date(boundary - 1800000),
            endedAt: new Date(boundary + 1800000),
          },
        ],
      };
      expect(
        calculateSessionDurationWithinPeriod(session, period, period.end),
      ).toBe(1800);
    },
  );

  it("does not count a whole paused day as an active day", () => {
    const session = {
      startedAt: date("2026-09-01T20:00:00Z"),
      endedAt: date("2026-09-03T02:00:00Z"),
      pauses: [
        {
          startedAt: date("2026-09-01T21:00:00Z"),
          endedAt: date("2026-09-03T01:00:00Z"),
        },
      ],
    };
    const start = DateTime.fromISO("2026-09-01", { zone: "Europe/Amsterdam" });
    expect(
      countActiveDaysWithinPeriod(
        [session],
        { start, end: start.plus({ days: 3 }) },
        start.plus({ days: 3 }),
      ),
    ).toBe(2);
    expect(
      calculateSessionDurationWithinPeriod(
        session,
        { start: start.plus({ days: 1 }), end: start.plus({ days: 2 }) },
        start.plus({ days: 3 }),
      ),
    ).toBe(0);
  });

  it.each([
    [
      "2026-03-29T00:30:00Z",
      "2026-03-29T02:30:00Z",
      "2026-03-29T00:45:00Z",
      "2026-03-29T01:45:00Z",
    ],
    [
      "2026-10-25T00:30:00Z",
      "2026-10-25T02:30:00Z",
      "2026-10-25T00:45:00Z",
      "2026-10-25T01:45:00Z",
    ],
  ])(
    "uses actual UTC time through DST from %s",
    (start, end, pauseStart, pauseEnd) => {
      const session = {
        startedAt: date(start),
        endedAt: date(end),
        pauses: [{ startedAt: date(pauseStart), endedAt: date(pauseEnd) }],
      };
      const day = DateTime.fromISO(start)
        .setZone("Europe/Amsterdam")
        .startOf("day");
      expect(
        calculateSessionDurationWithinPeriod(
          session,
          { start: day, end: day.plus({ days: 1 }) },
          day.plus({ days: 1 }),
        ),
      ).toBe(3600);
    },
  );
});
