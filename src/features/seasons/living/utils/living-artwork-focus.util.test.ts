import { describe, expect, it } from "vitest";
import { desktopArtworkFocusStyle } from "./living-artwork-focus.util";

describe("desktop artwork focus", () => {
  it("pans on each axis even when the artwork and frame share an aspect ratio", () => {
    const centered = desktopArtworkFocusStyle(0.5, 0.5);
    const movedHorizontally = desktopArtworkFocusStyle(1, 0.5);
    const movedVertically = desktopArtworkFocusStyle(0.5, 1);

    expect(centered.transform).toContain("scale(");
    expect(movedHorizontally.transform).not.toBe(centered.transform);
    expect(movedVertically.transform).not.toBe(centered.transform);
    expect(movedHorizontally.transform).not.toBe(movedVertically.transform);
  });
});
