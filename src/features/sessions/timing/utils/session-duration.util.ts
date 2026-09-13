import { DateTime } from "luxon";
import type { Period } from "@/lib/dates/utils/period.util";

export type TimedSession = {
  startedAt: Date;
  endedAt: Date | null;
  pauses: ReadonlyArray<{ startedAt: Date; endedAt: Date | null }>;
};

/** Subtract intersecting breaks before rounding, including an unfinished break. */
export function calculateSessionMilliseconds(
  session: TimedSession,
  nowMs = Date.now(),
  range?: { start: number; end: number },
) {
  const start = Math.max(
    session.startedAt.getTime(),
    range?.start ?? -Infinity,
  );
  const end = Math.min(
    session.endedAt?.getTime() ?? nowMs,
    nowMs,
    range?.end ?? Infinity,
  );
  if (end <= start) return 0;
  const paused = session.pauses.reduce(
    (total, pause) =>
      total +
      Math.max(
        0,
        Math.min(pause.endedAt?.getTime() ?? end, end) -
          Math.max(pause.startedAt.getTime(), start),
      ),
    0,
  );
  return Math.max(0, end - start - paused);
}

export function calculateSessionDurationWithinPeriod(
  session: TimedSession,
  period: Pick<Period, "start" | "end">,
  now: DateTime,
) {
  return Math.floor(
    calculateSessionMilliseconds(session, now.toMillis(), {
      start: period.start.toMillis(),
      end: period.end.toMillis(),
    }) / 1000,
  );
}

export function countActiveDaysWithinPeriod(
  sessions: TimedSession[],
  period: Pick<Period, "start" | "end">,
  now: DateTime,
) {
  let count = 0;
  for (
    let start = period.start.startOf("day");
    start < DateTime.min(period.end, now);
    start = start.plus({ days: 1 })
  ) {
    if (
      sessions.some(
        (session) =>
          calculateSessionMilliseconds(session, now.toMillis(), {
            start: Math.max(start.toMillis(), period.start.toMillis()),
            end: Math.min(
              start.plus({ days: 1 }).toMillis(),
              period.end.toMillis(),
            ),
          }) > 0,
      )
    )
      count++;
  }
  return count;
}

export function getSessionTiming(session: TimedSession, nowMs = Date.now()) {
  const openPause = session.pauses.find((pause) => !pause.endedAt);
  const status: "RUNNING" | "PAUSED" | "COMPLETED" = session.endedAt
    ? "COMPLETED"
    : openPause
      ? "PAUSED"
      : "RUNNING";
  const lastResume = session.pauses.reduce(
    (latest, pause) => Math.max(latest, pause.endedAt?.getTime() ?? latest),
    session.startedAt.getTime(),
  );
  const runningSince =
    status === "RUNNING" ? new Date(lastResume).toISOString() : null;
  // A read can start before the transition whose revision it observes. Its
  // captured clock must never truncate a confirmed pause, resume, or completion.
  const effectiveNow = Math.max(
    nowMs,
    session.endedAt?.getTime() ?? openPause?.startedAt.getTime() ?? lastResume,
  );
  const activeMilliseconds = calculateSessionMilliseconds(
    session,
    effectiveNow,
  );
  const span = Math.max(
    0,
    Math.min(session.endedAt?.getTime() ?? effectiveNow, effectiveNow) -
      session.startedAt.getTime(),
  );
  return {
    status,
    pausedAt: status === "PAUSED" ? openPause!.startedAt.toISOString() : null,
    accumulatedActiveMilliseconds: runningSince
      ? calculateSessionMilliseconds(session, lastResume)
      : activeMilliseconds,
    runningSince,
    totalPausedMilliseconds: Math.max(0, span - activeMilliseconds),
    durationSeconds: Math.floor(activeMilliseconds / 1000),
  };
}
