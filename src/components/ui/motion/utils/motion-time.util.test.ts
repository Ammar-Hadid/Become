import { describe, expect, it } from "vitest";
import { parseCssTimeList } from "@/components/ui/motion/utils/motion-time.util";

describe("parseCssTimeList", () => {
  it("returns the longest duration from comma-separated millisecond values", () => {
    expect(parseCssTimeList("90ms, 220ms, 150ms")).toBe(220);
  });

  it("converts seconds and ignores invalid entries", () => {
    expect(parseCssTimeList("0.3s, none, 90ms")).toBe(300);
  });

  it("returns zero when no usable duration is available", () => {
    expect(parseCssTimeList("")).toBe(0);
    expect(parseCssTimeList("initial")).toBe(0);
  });
});
