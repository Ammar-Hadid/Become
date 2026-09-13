import type { TimerSnapshot } from "@/features/sessions/types/session.types";

export function selectNewerTimerSnapshot(
  current: TimerSnapshot,
  incoming: TimerSnapshot,
): TimerSnapshot {
  return incoming.revision > current.revision ? incoming : current;
}

export function isTimerSnapshot(value: unknown): value is TimerSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<TimerSnapshot>;
  if (!Number.isInteger(snapshot.revision) || (snapshot.revision ?? -1) < 0)
    return false;
  if (snapshot.activeSession === null) return true;
  const session = snapshot.activeSession;
  return Boolean(
    session &&
    typeof session.id === "string" &&
    (session.status === "RUNNING" || session.status === "PAUSED") &&
    Number.isFinite(session.accumulatedActiveMilliseconds) &&
    (session.status === "PAUSED"
      ? session.runningSince === null
      : typeof session.runningSince === "string"),
  );
}
