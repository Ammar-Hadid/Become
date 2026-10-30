import { describe, expect, it } from "vitest";
import {
  normalizeWheelDistance,
  resolveWheelTravel,
} from "./desktop-area-navigation.component";

describe("desktop area navigation wheel travel", () => {
  it("limits one large wheel event to one area while retaining small trackpad deltas", () => {
    expect(normalizeWheelDistance(600, 0, 140)).toBe(140);
    expect(normalizeWheelDistance(-600, 0, 140)).toBe(-140);
    expect(normalizeWheelDistance(18, 0, 140)).toBe(18);
    expect(normalizeWheelDistance(3, 1, 140)).toBe(140);
  });

  it("carries partial trackpad movement to the next event", () => {
    const first = resolveWheelTravel(0, -80, 140);
    expect(first).toEqual({ steps: 0, offset: -80 });
    expect(resolveWheelTravel(first.offset, -80, 140)).toEqual({
      steps: 1,
      offset: -20,
    });
  });
});
