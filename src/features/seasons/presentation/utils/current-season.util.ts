const BECOME_TIMEZONE = "Europe/Amsterdam";

function becomeCalendarParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: BECOME_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find(({ type }) => type === "year")?.value),
    month: Number(parts.find(({ type }) => type === "month")?.value),
  };
}

export function isCurrentBecomeSeason(
  year: number,
  quarter: number,
  now = new Date(),
) {
  const current = becomeCalendarParts(now);
  return (
    year === current.year && quarter === Math.floor((current.month - 1) / 3) + 1
  );
}
