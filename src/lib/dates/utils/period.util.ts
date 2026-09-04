import { DateTime, Interval } from "luxon";

export const TIMEFRAMES = ["week", "month", "season", "year"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export type Period = {
  timeframe: Timeframe;
  start: DateTime;
  end: DateTime;
  label: string;
};

export type PeriodBucket = Pick<Period, "start" | "end"> & { label: string };

export function isTimeframe(value: string | null): value is Timeframe {
  return TIMEFRAMES.includes(value as Timeframe);
}

export function getSeasonForDate(date: DateTime) {
  const season = Math.floor((date.month - 1) / 3) + 1;
  const startMonth = (season - 1) * 3 + 1;
  const start = date.set({ month: startMonth, day: 1 }).startOf("day");
  return {
    season,
    year: date.year,
    label: `Season ${season} · ${date.year}`,
    start,
    end: start.plus({ months: 3 }),
  };
}

export function getPeriod(date: DateTime, timeframe: Timeframe): Period {
  if (timeframe === "week") {
    const start = date.startOf("week");
    return {
      timeframe,
      start,
      end: start.plus({ weeks: 1 }),
      label: `Week ${date.weekNumber}`,
    };
  }
  if (timeframe === "month") {
    const start = date.startOf("month");
    return {
      timeframe,
      start,
      end: start.plus({ months: 1 }),
      label: date.toFormat("LLLL yyyy"),
    };
  }
  if (timeframe === "season") {
    const season = getSeasonForDate(date);
    return {
      timeframe,
      start: season.start,
      end: season.end,
      label: season.label,
    };
  }
  const start = date.startOf("year");
  return {
    timeframe,
    start,
    end: start.plus({ years: 1 }),
    label: String(date.year),
  };
}

export function getPreviousPeriod(period: Period): Period {
  const unit =
    period.timeframe === "season"
      ? { months: 3 }
      : { [`${period.timeframe}s`]: 1 };
  const start = period.start.minus(unit);
  const reference = start.plus({ milliseconds: 1 });
  return getPeriod(reference, period.timeframe) satisfies Period & {
    start: DateTime;
    end: DateTime;
  };
}

export function getPeriodBuckets(period: Period): PeriodBucket[] {
  if (period.timeframe === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const start = period.start.plus({ days: index });
      return {
        start,
        end: start.plus({ days: 1 }),
        label: start.toFormat("ccc"),
      };
    });
  }

  if (period.timeframe === "month") {
    const buckets: PeriodBucket[] = [];
    let start = period.start;
    let index = 1;
    while (start < period.end) {
      const end = DateTime.min(start.plus({ weeks: 1 }), period.end);
      buckets.push({ start, end, label: `W${index++}` });
      start = end;
    }
    return buckets;
  }

  const months = period.timeframe === "season" ? 3 : 12;
  return Array.from({ length: months }, (_, index) => {
    const start = period.start.plus({ months: index });
    return {
      start,
      end: start.plus({ months: 1 }),
      label: start.toFormat("LLL"),
    };
  });
}

export type TimedSession = { startedAt: Date; endedAt: Date | null };

export function calculateSessionDurationWithinPeriod(
  session: TimedSession,
  period: Pick<Period, "start" | "end">,
  now: DateTime,
) {
  const startedAt = DateTime.fromJSDate(session.startedAt, { zone: "utc" });
  const endedAt = session.endedAt
    ? DateTime.fromJSDate(session.endedAt, { zone: "utc" })
    : now.toUTC();
  const overlap = Interval.fromDateTimes(
    DateTime.max(startedAt, period.start.toUTC()),
    DateTime.min(endedAt, period.end.toUTC(), now.toUTC()),
  );
  return overlap.isValid
    ? Math.max(0, Math.floor(overlap.length("seconds")))
    : 0;
}

export function countActiveDaysWithinPeriod(
  sessions: TimedSession[],
  period: Pick<Period, "start" | "end">,
  now: DateTime,
) {
  let activeDays = 0;
  let dayStart = period.start.startOf("day");
  const effectiveEnd = DateTime.min(period.end, now);

  while (dayStart < effectiveEnd) {
    const dayEnd = DateTime.min(dayStart.plus({ days: 1 }), period.end);
    if (
      sessions.some(
        (session) =>
          calculateSessionDurationWithinPeriod(
            session,
            { start: dayStart, end: dayEnd },
            now,
          ) > 0,
      )
    ) {
      activeDays += 1;
    }
    dayStart = dayStart.plus({ days: 1 });
  }

  return activeDays;
}

export function formatDuration(totalSeconds: number, compact = false) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (compact) return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return [hours, minutes, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
