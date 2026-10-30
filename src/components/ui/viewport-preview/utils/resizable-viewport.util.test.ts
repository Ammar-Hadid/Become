import { describe, expect, it } from "vitest";
import { PHONE_ARTWORK_VIEWPORT } from "../config/resizable-viewport.config";
import { resizeViewport } from "./resizable-viewport.util";

const { bounds, initialSize } = PHONE_ARTWORK_VIEWPORT;

describe("resizable viewport", () => {
  it("maps a scaled drag back to logical pixels", () => {
    expect(resizeViewport(initialSize, "corner", 20, -30, 0.5, bounds)).toEqual(
      {
        width: 415,
        height: 607,
      },
    );
  });

  it("changes only the selected axis and respects configured limits", () => {
    expect(resizeViewport(initialSize, "width", 500, 500, 1, bounds)).toEqual({
      width: 430,
      height: 667,
    });
    expect(
      resizeViewport(initialSize, "height", -500, -500, 1, bounds),
    ).toEqual({ width: 375, height: 568 });
  });
});
