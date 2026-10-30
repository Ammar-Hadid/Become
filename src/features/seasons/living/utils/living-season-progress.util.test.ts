import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { seasonCalendar } from "@/features/seasons/utils/season-calendar.util";
import { calculateLivingSeasonFacts } from "./living-season-progress.util";
import type { GoalView } from "@/features/direction/types/direction.types";

const goal = (actual: string | null, availability: "AVAILABLE" | "RECORDED_ZERO" | "PENDING_REVIEW" = "AVAILABLE") => ({
  id: "goal-1",
  title: "Complete 30 interviews",
  startOn: "2026-10-01",
  targetOn: "2026-12-31",
  criterionMode: "ALL" as const,
  criteria: [{ key: "interviews", metric: "CONVERSATIONS" as const, label: "Interviews", target: "30" }],
  evaluation: { criteria: [{ key: "interviews", value: actual, target: "30", availability }] },
}) as Pick<GoalView, "id" | "title" | "startOn" | "targetOn" | "criterionMode" | "criteria" | "evaluation">;

describe("Living Season progress", () => {
  const on = (date: string) => seasonCalendar(2026, 4, DateTime.fromISO(`${date}T12:00`, { zone: "Europe/Amsterdam" }));

  it("uses the actual quarter length and advances seven 14-day chapters", () => {
    expect(calculateLivingSeasonFacts(on("2026-10-01"), [], "2026-10-01")).toMatchObject({ totalDays: 92, chapter: 1, state: "INSUFFICIENT_EVIDENCE" });
    expect(calculateLivingSeasonFacts(on("2026-10-15"), [], "2026-10-15").chapter).toBe(2);
    expect(calculateLivingSeasonFacts(on("2026-12-31"), [], "2026-12-31").chapter).toBe(7);
  });

  it("classifies recorded pace gaps at the agreed boundaries", () => {
    const calendar = on("2026-11-15");
    expect(calculateLivingSeasonFacts(calendar, [goal("12")], "2026-11-15").state).toBe("ON_TRACK");
    expect(calculateLivingSeasonFacts(calendar, [goal("10")], "2026-11-15").state).toBe("NEUTRAL");
    expect(calculateLivingSeasonFacts(calendar, [goal("8")], "2026-11-15").state).toBe("FAR_BEHIND");
  });

  it("keeps the exact ten- and twenty-point boundaries stable", () => {
    const near = goal("40");
    near.criteria[0].target = "100";
    near.evaluation.criteria[0].target = "100";
    expect(calculateLivingSeasonFacts(on("2026-11-15"), [near], "2026-11-15").state).toBe("ON_TRACK");
    near.evaluation.criteria[0].value = "30";
    expect(calculateLivingSeasonFacts(on("2026-11-15"), [near], "2026-11-15").state).toBe("FAR_BEHIND");
  });

  it("counts calendar dates through the autumn timezone change", () => {
    const facts = calculateLivingSeasonFacts(on("2026-10-25"), [goal("0", "RECORDED_ZERO")], "2026-10-25");
    expect(facts).toMatchObject({ dayNumber: 25, totalDays: 92, chapter: 2 });
    expect(facts.expectedPercent).toBeCloseTo(25 / 92 * 100);
  });

  it("does not silently treat missing or changed evidence as progress", () => {
    expect(calculateLivingSeasonFacts(on("2026-11-15"), [goal(null, "PENDING_REVIEW")], "2026-11-15")).toMatchObject({ state: "INSUFFICIENT_EVIDENCE", actualPercent: null, measuredGoals: 0 });
    expect(calculateLivingSeasonFacts(on("2026-11-15"), [goal("0", "RECORDED_ZERO")], "2026-11-15")).toMatchObject({ state: "FAR_BEHIND", actualPercent: 0 });
  });

  it("recomputes the state after a corrected recorded value", () => {
    const corrected = goal("8");
    const calendar = on("2026-11-15");
    expect(calculateLivingSeasonFacts(calendar, [corrected], "2026-11-15").state).toBe("FAR_BEHIND");
    corrected.evaluation.criteria[0].value = "16";
    expect(calculateLivingSeasonFacts(calendar, [corrected], "2026-11-15").state).toBe("ON_TRACK");
  });

  it("uses a criterion's own pace window instead of the whole Season", () => {
    const lateGoal = goal("0");
    lateGoal.criteria[0].startOn = "2026-12-01";
    lateGoal.criteria[0].endOn = "2026-12-31";
    const facts = calculateLivingSeasonFacts(on("2026-11-15"), [lateGoal], "2026-11-15");
    expect(facts).toMatchObject({ expectedPercent: 0, state: "ON_TRACK" });
  });
});
