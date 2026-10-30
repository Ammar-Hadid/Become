const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** The rolling chart always ends today; only its current-week tail belongs in the streak. */
export function currentWeekStreakDays(
  rollingDays: ReadonlyArray<{ seconds: number }>,
  weekday: number,
) {
  const elapsedDays = Math.max(1, Math.min(7, Math.trunc(weekday)));
  const currentWeek = rollingDays.slice(-elapsedDays);

  return WEEKDAY_LABELS.map((label, index) => ({
    label,
    seconds: index < elapsedDays ? (currentWeek[index]?.seconds ?? 0) : 0,
  }));
}
