import {
  calculateSessionMilliseconds,
  type TimedSession,
} from "./session-duration.util";
import { MAX_CORRECTED_SESSION_SECONDS } from "@/features/sessions/timing/constants/session-duration.constants";

/** Find the earliest end instant yielding the requested focused seconds. */
export function resolveSessionEndForDuration(
  session: TimedSession & { endedAt: Date },
  expectedEnd: Date,
  durationSeconds: number,
  now = new Date(),
): Date | "conflict" | "invalid-duration" {
  if (session.endedAt.getTime() !== expectedEnd.getTime()) return "conflict";
  const startMs = session.startedAt.getTime();
  const nowMs = now.getTime();
  if (
    !Number.isSafeInteger(durationSeconds) ||
    durationSeconds < 0 ||
    durationSeconds > MAX_CORRECTED_SESSION_SECONDS ||
    startMs > nowMs
  )
    return "invalid-duration";

  const focusedAt = (endMs: number) =>
    calculateSessionMilliseconds(
      { ...session, endedAt: new Date(endMs) },
      nowMs,
    );
  if (durationSeconds > Math.floor(focusedAt(nowMs) / 1000))
    return "invalid-duration";
  if (
    durationSeconds === Math.floor(focusedAt(session.endedAt.getTime()) / 1000)
  )
    return session.endedAt;

  const targetMs = durationSeconds * 1000;
  let low = startMs;
  let high = nowMs;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (focusedAt(middle) >= targetMs) high = middle;
    else low = middle + 1;
  }
  return new Date(low);
}
