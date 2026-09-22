import { describe, expect, it } from "vitest";
import {
  composeDurationSeconds,
  splitDurationSeconds,
  stepDurationValue,
} from "@/features/sessions/details/components/duration-picker.component";

describe("duration picker values", () => {
  it("preserves durations longer than one day", () => {
    const durationSeconds = 49 * 60 * 60 + 7 * 60 + 8;

    expect(splitDurationSeconds(durationSeconds)).toEqual({
      hours: 49,
      minutes: 7,
      seconds: 8,
    });
    expect(composeDurationSeconds(49, 7, 8)).toBe(durationSeconds);
  });

  it("wraps minute and second wheels without wrapping hours", () => {
    expect(stepDurationValue(59, 1, 59)).toBe(0);
    expect(stepDurationValue(0, -1, 59)).toBe(59);
    expect(stepDurationValue(0, -1)).toBe(0);
    expect(stepDurationValue(49, 1)).toBe(50);
  });
});
