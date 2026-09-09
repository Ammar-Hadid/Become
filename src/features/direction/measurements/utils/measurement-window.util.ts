import { DateTime } from "luxon";
import type { CriterionDraft } from "@/features/direction/types/direction.types";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
export function measurementWindow(
  c: CriterionDraft,
  lifetime: { startOn: string; targetOn?: string },
  at: Date,
) {
  const startOn = c.startOn ?? lifetime.startOn,
    endOn = c.endOn ?? lifetime.targetOn;
  const start = DateTime.fromISO(startOn, { zone: "Europe/Amsterdam" }).startOf(
    "day",
  );
  const end = endOn
    ? DateTime.fromISO(endOn, { zone: "Europe/Amsterdam" })
        .plus({ days: 1 })
        .startOf("day")
    : DateTime.fromJSDate(at).plus({ milliseconds: 1 });
  if (!start.isValid || !end.isValid || (endOn && end < start))
    throw new DirectionError(
      "Choose a valid measurement window.",
      `criteria.${c.key}.endOn`,
    );
  return {
    start: start.toUTC().toJSDate(),
    end: DateTime.min(end, DateTime.fromJSDate(at).plus({ milliseconds: 1 }))
      .toUTC()
      .toJSDate(),
    startOn,
    endOn,
    wording: endOn
      ? `${startOn} through ${endOn} (Europe/Amsterdam)`
      : `since ${startOn} (Europe/Amsterdam)`,
  };
}
