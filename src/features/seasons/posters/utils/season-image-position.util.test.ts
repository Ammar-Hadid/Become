import { describe, expect, it } from "vitest";
import {
  seasonImageCoverOverflow,
  seasonImagePosition,
  seasonImagePositionAfterDrag,
  seasonImagePositionAfterNudge,
  seasonImagePositionDescription,
} from "./season-image-position.util";

describe("season image positioning", () => {
  it("calculates the movable overflow of a covered image", () => {
    expect(seasonImageCoverOverflow(400, 300, 400, 600)).toEqual({
      x: 0,
      y: 300,
    });
    expect(seasonImageCoverOverflow(400, 300, 800, 300)).toEqual({
      x: 400,
      y: 0,
    });
  });

  it("translates drag distance into a clamped object position", () => {
    expect(
      seasonImagePositionAfterDrag({ x: 0.5, y: 0.5 }, -100, 75, {
        x: 400,
        y: 300,
      }),
    ).toEqual({ x: 0.75, y: 0.25 });
    expect(seasonImagePosition(4, -2)).toEqual({ x: 1, y: 0 });
  });

  it("nudges the image in the visual direction requested", () => {
    expect(
      seasonImagePositionAfterNudge({ x: 0.5, y: 0.5 }, "ArrowLeft"),
    ).toEqual({ x: 0.52, y: 0.5 });
    expect(
      seasonImagePositionAfterNudge({ x: 0.5, y: 0.5 }, "ArrowUp", true),
    ).toEqual({ x: 0.5, y: 0.58 });
  });

  it("describes the focus without exposing implementation percentages", () => {
    expect(seasonImagePositionDescription({ x: 0.5, y: 0.5 })).toBe(
      "Image focus is centered.",
    );
    expect(seasonImagePositionDescription({ x: 0.8, y: 0.2 })).toBe(
      "Image focus is right and high.",
    );
  });
});
