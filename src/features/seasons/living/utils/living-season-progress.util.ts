import { DateTime } from "luxon";
import type { GoalView } from "@/features/direction/types/direction.types";
import type { SeasonCalendar } from "@/features/seasons/types/season.types";
import type { LivingSeasonFacts } from "@/features/seasons/living/types/living-season.types";

type PaceGoal = Pick<GoalView, "id" | "title" | "startOn" | "targetOn" | "criterionMode" | "criteria" | "evaluation">;
const zone = "Europe/Amsterdam";
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function plannedPercent(startOn: string, endOn: string, today: string) {
  const start = DateTime.fromISO(startOn, { zone }).startOf("day");
  const end = DateTime.fromISO(endOn, { zone }).startOf("day");
  const at = DateTime.fromISO(today, { zone }).startOf("day");
  if (!start.isValid || !end.isValid || !at.isValid || end < start) return null;
  const days = Math.round(end.diff(start, "days").days) + 1;
  const elapsed = Math.round(at.diff(start, "days").days) + 1;
  return clamp((elapsed / days) * 100);
}

export function calculateLivingSeasonFacts(
  calendar: SeasonCalendar,
  goals: PaceGoal[],
  today: string,
): LivingSeasonFacts {
  const chapter = Math.min(7, Math.max(1, Math.floor((Math.max(1, calendar.dayNumber) - 1) / 14) + 1));
  const results = goals.map((goal) => {
    const criteria = goal.evaluation.criteria.map((criterion) => {
      const plan = goal.criteria.find((item) => item.key === criterion.key);
      const target = Number(criterion.target);
      const actual = Number(criterion.value);
      const measured = ["AVAILABLE", "RECORDED_ZERO"].includes(criterion.availability) &&
        criterion.value !== null && criterion.target !== null &&
        Number.isFinite(target) && target > 0 && Number.isFinite(actual) && actual >= 0;
      const expected = plannedPercent(plan?.startOn ?? goal.startOn ?? calendar.startOn, plan?.endOn ?? goal.targetOn ?? calendar.endOn, today);
      return {
        actual: measured ? clamp((actual / target) * 100) : null,
        expected,
      };
    });
    const missingEvidence = criteria.length === 0 || criteria.some((criterion) => criterion.actual === null || criterion.expected === null);
    const available = criteria.filter((criterion): criterion is { actual: number; expected: number } => criterion.actual !== null && criterion.expected !== null);
    let actualPercent: number | null = null;
    let expectedPercent: number | null = null;
    if (!missingEvidence) {
      const selected = goal.criterionMode === "ANY"
        ? [available.reduce((best, item) => item.actual - item.expected > best.actual - best.expected ? item : best)]
        : available;
      actualPercent = selected.reduce((sum, item) => sum + item.actual, 0) / selected.length;
      expectedPercent = selected.reduce((sum, item) => sum + item.expected, 0) / selected.length;
    }
    return {
      id: goal.id,
      title: goal.title,
      actualPercent,
      expectedPercent,
      gapPoints: actualPercent === null || expectedPercent === null ? null : actualPercent - expectedPercent,
      missingEvidence,
    };
  });
  const complete = results.filter((result) => !result.missingEvidence);
  const enoughEvidence = results.length > 0 && complete.length === results.length;
  const actualPercent = enoughEvidence ? complete.reduce((sum, goal) => sum + goal.actualPercent!, 0) / complete.length : null;
  const expectedPercent = enoughEvidence ? complete.reduce((sum, goal) => sum + goal.expectedPercent!, 0) / complete.length : null;
  const gapPoints = actualPercent === null || expectedPercent === null ? null : actualPercent - expectedPercent;
  return {
    chapter,
    dayNumber: calendar.dayNumber,
    totalDays: calendar.totalDays,
    state: gapPoints === null ? "INSUFFICIENT_EVIDENCE" : gapPoints <= -20 ? "FAR_BEHIND" : gapPoints < -10 ? "NEUTRAL" : "ON_TRACK",
    actualPercent,
    expectedPercent,
    gapPoints,
    measuredGoals: complete.length,
    totalGoals: results.length,
    goals: results,
  };
}
