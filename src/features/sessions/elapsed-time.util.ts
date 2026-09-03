export function calculateElapsedSeconds(startedAt: string, nowMs: number) {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return 0;

  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}
