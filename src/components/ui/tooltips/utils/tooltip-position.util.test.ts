import { describe, expect, it } from "vitest";
import { positionTooltip } from "./tooltip-position.util";

const viewport = { width: 320, height: 240 };
const tooltip = { width: 120, height: 32 };

describe("positionTooltip", () => {
  it("keeps the preferred side when it fits", () => {
    expect(
      positionTooltip({
        trigger: {
          top: 100,
          right: 140,
          bottom: 140,
          left: 100,
          width: 40,
          height: 40,
        },
        tooltip,
        viewport,
        preferredSide: "right",
        gap: 10,
        inset: 8,
      }),
    ).toEqual({ side: "right", top: 104, left: 150 });
  });

  it("flips at an edge and clamps the cross axis inside the viewport", () => {
    expect(
      positionTooltip({
        trigger: {
          top: 4,
          right: 300,
          bottom: 44,
          left: 260,
          width: 40,
          height: 40,
        },
        tooltip,
        viewport,
        preferredSide: "right",
        gap: 10,
        inset: 8,
      }),
    ).toEqual({ side: "left", top: 8, left: 130 });
  });
});
