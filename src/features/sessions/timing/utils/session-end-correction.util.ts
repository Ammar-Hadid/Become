export function validateSessionEndCorrection(
  startedAt: Date,
  currentEnd: Date,
  expectedEnd: Date,
  correctedEnd: Date,
  now = new Date(),
): "conflict" | "invalid-end" | null {
  if (currentEnd.getTime() !== expectedEnd.getTime()) return "conflict";
  if (
    !Number.isFinite(correctedEnd.getTime()) ||
    correctedEnd < startedAt ||
    correctedEnd > now
  )
    return "invalid-end";
  return null;
}
