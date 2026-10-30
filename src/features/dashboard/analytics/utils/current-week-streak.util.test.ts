import { describe, expect, it } from "vitest";
import { currentWeekStreakDays } from "./current-week-streak.util";

const rollingDays = [0, 1, 2, 3, 4, 5, 6].map((seconds) => ({ seconds }));

describe("currentWeekStreakDays", () => {
  it("starts with this Monday and leaves future days empty", () => {
    expect(currentWeekStreakDays(rollingDays, 1)).toEqual([
      { label: "Mon", seconds: 6 },
      { label: "Tue", seconds: 0 },
      { label: "Wed", seconds: 0 },
      { label: "Thu", seconds: 0 },
      { label: "Fri", seconds: 0 },
      { label: "Sat", seconds: 0 },
      { label: "Sun", seconds: 0 },
    ]);
  });

  it("uses only this week's elapsed days midweek", () => {
    expect(currentWeekStreakDays(rollingDays, 4).map((day) => day.seconds)).toEqual([
      3, 4, 5, 6, 0, 0, 0,
    ]);
  });

  it("uses all seven days on Sunday", () => {
    expect(currentWeekStreakDays(rollingDays, 7).map((day) => day.seconds)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});
