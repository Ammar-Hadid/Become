import { describe, expect, it } from "vitest";
import {
  composeDurationSeconds,
  normalizeWheelDistance,
  parseDurationEntry,
  resolveWheelTravel,
  splitDurationSeconds,
  stepDurationValue,
} from "@/features/sessions/details/components/duration-picker.component";

describe("duration picker values", () => {
  it("caps durations at 24 hours", () => {
    const durationSeconds = 49 * 60 * 60 + 7 * 60 + 8;

    expect(splitDurationSeconds(durationSeconds)).toEqual({
      hours: 24,
      minutes: 0,
      seconds: 0,
    });
    expect(composeDurationSeconds(24, 7, 8)).toBe(24 * 60 * 60);
    expect(composeDurationSeconds(23, 59, 59)).toBe(24 * 60 * 60 - 1);
  });

  it("wraps minute and second wheels without wrapping hours", () => {
    expect(stepDurationValue(59, 1, 59)).toBe(0);
    expect(stepDurationValue(0, -1, 59)).toBe(59);
    expect(stepDurationValue(0, -1)).toBe(0);
    expect(stepDurationValue(24, 1, undefined, 24)).toBe(24);
  });

  it("accepts only whole typed values within a column range", () => {
    expect(parseDurationEntry("24", 24)).toBe(24);
    expect(parseDurationEntry("07", 59)).toBe(7);
    expect(parseDurationEntry("25", 24)).toBeNull();
    expect(parseDurationEntry("1.5", 59)).toBeNull();
    expect(parseDurationEntry("", 59)).toBeNull();
  });

  it("normalizes wheel units and caps one event to three rows", () => {
    expect(normalizeWheelDistance(12, 0, 48)).toBe(12);
    expect(normalizeWheelDistance(3, 1, 48)).toBe(48);
    expect(normalizeWheelDistance(-1, 2, 48)).toBe(-144);
    expect(normalizeWheelDistance(1_000, 0, 48)).toBe(144);
  });

  it("limits visual travel when a fast gesture reaches an hours boundary", () => {
    expect(resolveWheelTravel(23, 0, -150, 48, 24)).toEqual({
      value: 24,
      offset: -16,
      hitBoundary: true,
    });
    expect(resolveWheelTravel(1, 0, 150, 48, 24)).toEqual({
      value: 0,
      offset: 16,
      hitBoundary: true,
    });
    expect(resolveWheelTravel(1, 0, -55, 48, 24)).toEqual({
      value: 2,
      offset: -7,
      hitBoundary: false,
    });
  });

  it("holds a hard boundary still during repeated outward travel", () => {
    const upperBoundary = resolveWheelTravel(23, 0, -150, 48, 24);
    const heldUpperBoundary = resolveWheelTravel(
      upperBoundary.value,
      upperBoundary.offset,
      -12,
      48,
      24,
    );
    const lowerBoundary = resolveWheelTravel(1, 0, 150, 48, 24);
    const heldLowerBoundary = resolveWheelTravel(
      lowerBoundary.value,
      lowerBoundary.offset,
      12,
      48,
      24,
    );

    expect(heldUpperBoundary).toEqual({
      value: 24,
      offset: 0,
      hitBoundary: true,
    });
    expect(resolveWheelTravel(24, 0, -144, 48, 24)).toEqual(heldUpperBoundary);
    expect(heldLowerBoundary).toEqual({
      value: 0,
      offset: 0,
      hitBoundary: true,
    });
    expect(resolveWheelTravel(0, 0, 144, 48, 24)).toEqual(heldLowerBoundary);
  });

  it("continues inward from a hard boundary", () => {
    expect(resolveWheelTravel(24, 0, 48, 48, 24)).toEqual({
      value: 23,
      offset: 0,
      hitBoundary: false,
    });
    expect(resolveWheelTravel(0, 0, -48, 48, 24)).toEqual({
      value: 1,
      offset: 0,
      hitBoundary: false,
    });
  });
});
