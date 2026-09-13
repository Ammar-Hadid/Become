import { describe, expect, it } from "vitest";
import { reviewPeriod } from "./review-period.util";
describe("review calendar semantics", () => {
  it("uses Amsterdam midnight, DST and exclusive calendar ends", () => {
    const p = reviewPeriod("week", "2026-03-23", new Date("2026-04-02T12:00Z"));
    expect(p.start).toBe("2026-03-22T23:00:00.000Z");
    expect(p.end).toBe("2026-03-29T22:00:00.000Z");
    expect((Date.parse(p.end) - Date.parse(p.start)) / 3600000).toBe(167);
    expect(p.comparison.mode).toBe("FULL_CALENDAR");
  });
  it("compares partial periods only to equal elapsed windows", () => {
    const p = reviewPeriod(
      "month",
      "2026-03-01",
      new Date("2026-03-10T12:00Z"),
    );
    expect(p.state).toBe("OPEN");
    expect(p.comparison.mode).toBe("EQUAL_ELAPSED");
    expect(p.comparison.available).toBe(true);
    expect(Date.parse(p.evaluatedThrough) - Date.parse(p.start)).toBe(
      Date.parse(p.comparison.end) - Date.parse(p.comparison.start),
    );
    expect(
      reviewPeriod("month", "2026-03-01", new Date("2026-03-30T12:00Z"))
        .comparison.available,
    ).toBe(false);
  });
  it("rejects mid-period identities and labels future periods explicitly", () => {
    expect(() => reviewPeriod("season", "2026-05-01")).toThrow("first date");
    expect(() => reviewPeriod("week", "2026-09-08")).toThrow("first date");
    expect(
      reviewPeriod("season", "2027-01-01", new Date("2026-09-13T12:00Z")).state,
    ).toBe("UPCOMING");
  });
});
