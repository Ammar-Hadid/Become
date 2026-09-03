import { describe, expect, it } from "vitest";
import { calculateElapsedSeconds } from "@/features/sessions/elapsed-time.util";

describe("active session elapsed time", () => {
  it("derives elapsed seconds from the persisted start time", () => {
    expect(
      calculateElapsedSeconds(
        "2026-09-03T10:00:00.000Z",
        Date.parse("2026-09-03T10:42:17.800Z"),
      ),
    ).toBe(2537);
  });

  it("recovers the same elapsed time after a refresh", () => {
    const startedAt = "2026-09-03T10:00:00.000Z";
    const beforeRefresh = calculateElapsedSeconds(
      startedAt,
      Date.parse("2026-09-03T10:05:00.000Z"),
    );
    const afterRefresh = calculateElapsedSeconds(
      startedAt,
      Date.parse("2026-09-03T10:05:02.000Z"),
    );

    expect(afterRefresh).toBe(beforeRefresh + 2);
  });

  it("never displays a negative elapsed time", () => {
    expect(
      calculateElapsedSeconds(
        "2026-09-03T10:00:01.000Z",
        Date.parse("2026-09-03T10:00:00.000Z"),
      ),
    ).toBe(0);
  });
});
