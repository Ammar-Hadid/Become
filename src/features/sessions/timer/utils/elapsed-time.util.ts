export function calculateElapsedSeconds(startedAt: string, nowMs: number) {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return 0;

  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

export function calculateFocusedSeconds(
  session: {
    accumulatedActiveMilliseconds: number;
    runningSince: string | null;
    status: "RUNNING" | "PAUSED" | "COMPLETED";
  },
  nowMs: number,
) {
  const runningSinceMs = session.runningSince
    ? Date.parse(session.runningSince)
    : null;
  const runningMilliseconds =
    session.status === "RUNNING" &&
    runningSinceMs !== null &&
    Number.isFinite(runningSinceMs)
      ? Math.max(0, nowMs - runningSinceMs)
      : 0;
  return Math.max(
    0,
    Math.floor(
      (session.accumulatedActiveMilliseconds + runningMilliseconds) / 1000,
    ),
  );
}
