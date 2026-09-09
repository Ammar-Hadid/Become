import { DateTime } from "luxon";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import type {
  SeasonCalendar,
  SeasonDraft,
} from "@/features/seasons/types/season.types";
export const emptySeasonDraft = (): SeasonDraft => ({
  title: "",
  intention: "",
  stage: 1,
  answers: {
    carryForward: "",
    leaveBehind: "",
    protect: "",
    meaningful: "",
    deferredSteps: [],
  },
  character: {
    name: "",
    sourceWork: "",
    adaptation: "",
    motivation: "",
    avoid: "",
    tone: "DIRECT",
    standards: [],
  },
});
export function seasonCalendar(
  year: number,
  quarter: number,
  now: DateTime = DateTime.now(),
): SeasonCalendar {
  const today = now.setZone("Europe/Amsterdam").startOf("day");
  const { start, end } = getSeasonForDate(
    DateTime.fromObject(
      { year, month: (quarter - 1) * 3 + 1, day: 1 },
      { zone: "Europe/Amsterdam" },
    ),
  );
  const totalDays = Math.round(end.diff(start, "days").days),
    elapsed = Math.round(today.diff(start, "days").days),
    remaining = Math.round(end.diff(today, "days").days);
  const phase: SeasonCalendar["phase"] =
    today < start
      ? "UPCOMING"
      : today >= end
        ? "ENDED"
        : remaining <= 3
          ? "FINAL_3"
          : remaining <= 7
            ? "FINAL_7"
            : remaining <= 14
              ? "FINAL_14"
              : elapsed >= Math.floor(totalDays / 2)
                ? "MIDPOINT"
                : elapsed < 7
                  ? "OPENING"
                  : "LIVING";
  const dayNumber = Math.max(0, Math.min(totalDays, elapsed + 1));
  return {
    year,
    quarter,
    label: `Season ${quarter} · ${year}`,
    startOn: start.toISODate()!,
    endOn: end.minus({ days: 1 }).toISODate()!,
    totalDays,
    dayNumber,
    daysAfterToday: Math.max(0, remaining - 1),
    phase,
    timeLabel:
      phase === "UPCOMING"
        ? `Begins ${start.toFormat("d LLLL")}`
        : phase === "ENDED"
          ? `Ended ${end.minus({ days: 1 }).toFormat("d LLLL yyyy")}`
          : `Day ${dayNumber} of ${totalDays} · ends ${end.minus({ days: 1 }).toFormat("d LLLL")}`,
  };
}
