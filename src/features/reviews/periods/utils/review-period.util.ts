import { DateTime } from "luxon";
import {
  getPeriod,
  getPreviousPeriod,
  type Timeframe,
} from "@/lib/dates/utils/period.util";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import type { ReviewPeriod } from "@/features/reviews/contracts/types/review.types";
export function reviewPeriod(
  timeframe: Timeframe,
  startOn: string,
  at = new Date(),
): ReviewPeriod {
  const reference = DateTime.fromISO(startOn, { zone: "Europe/Amsterdam" });
  if (!reference.isValid || reference.year < 1900 || reference.year > 2200)
    throw new DirectionError("Choose a valid review period.");
  const p = getPeriod(reference, timeframe),
    previous = getPreviousPeriod(p),
    now = DateTime.fromJSDate(at);
  if (p.start.toISODate() !== startOn)
    throw new DirectionError("Use the first date of this calendar period.");
  const ended = now >= p.end;
  const elapsed = Math.max(
    0,
    Math.min(
      now.toMillis() - p.start.toMillis(),
      p.end.toMillis() - p.start.toMillis(),
    ),
  );
  const matched = Math.min(
    elapsed,
    previous.end.toMillis() - previous.start.toMillis(),
  );
  const through = DateTime.min(p.end, DateTime.max(p.start, now));
  const previousEnd = ended
    ? previous.end
    : previous.start.plus({ milliseconds: matched });
  const label = (a: DateTime, b: DateTime) =>
    `${a.setZone("Europe/Amsterdam").toFormat("d LLL yyyy HH:mm")} – ${b.setZone("Europe/Amsterdam").toFormat("d LLL yyyy HH:mm")} (Amsterdam)`;
  return {
    timeframe,
    startOn,
    endOn: p.end.minus({ days: 1 }).toISODate()!,
    start: p.start.toUTC().toISO()!,
    end: p.end.toUTC().toISO()!,
    evaluatedThrough: through.toUTC().toISO()!,
    label: timeframe === "week" ? `${p.label} · ${p.start.weekYear}` : p.label,
    state: ended ? "ENDED" : now < p.start ? "UPCOMING" : "OPEN",
    timezone: "Europe/Amsterdam",
    comparison: {
      start: previous.start.toUTC().toISO()!,
      end: previousEnd.toUTC().toISO()!,
      label: label(previous.start, previousEnd),
      mode: ended ? "FULL_CALENDAR" : "EQUAL_ELAPSED",
      available: elapsed > 0 && (ended || elapsed <= matched),
    },
  };
}
export const reviewHref = (timeframe: Timeframe, startOn: string) =>
  `/reviews/${timeframe}/${startOn}`;
