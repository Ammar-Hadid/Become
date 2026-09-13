import { describe, expect, it } from "vitest";
import {
  calculateElapsedSeconds,
  calculateFocusedSeconds,
} from "@/features/sessions/timer/utils/elapsed-time.util";

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

describe("focused time across breaks", () => {
  it("keeps a paused session frozen through time away and reload", () => {
    const session = {
      status: "PAUSED" as const,
      accumulatedActiveMilliseconds: 12750,
      runningSince: null,
    };
    expect(
      calculateFocusedSeconds(session, Date.parse("2026-09-13T10:00:00Z")),
    ).toBe(12);
    expect(
      calculateFocusedSeconds(session, Date.parse("2026-09-14T10:00:00Z")),
    ).toBe(12);
  });

  it("adds the latest running span and rounds only the combined duration", () => {
    expect(
      calculateFocusedSeconds(
        {
          status: "RUNNING",
          accumulatedActiveMilliseconds: 1750,
          runningSince: "2026-09-13T10:00:00.000Z",
        },
        Date.parse("2026-09-13T10:00:00.750Z"),
      ),
    ).toBe(2);
  });

  it("uses a resume anchor rather than counting the intervening break", () => {
    expect(
      calculateFocusedSeconds(
        {
          status: "RUNNING",
          accumulatedActiveMilliseconds: 120000,
          runningSince: "2026-09-13T10:30:00.000Z",
        },
        Date.parse("2026-09-13T10:30:05.000Z"),
      ),
    ).toBe(125);
  });

  it("does not add a span after completion or from a future anchor", () => {
    expect(
      calculateFocusedSeconds(
        {
          status: "COMPLETED",
          accumulatedActiveMilliseconds: 3100,
          runningSince: null,
        },
        Date.now(),
      ),
    ).toBe(3);
    expect(
      calculateFocusedSeconds(
        {
          status: "RUNNING",
          accumulatedActiveMilliseconds: 3100,
          runningSince: "2026-09-13T10:00:01Z",
        },
        Date.parse("2026-09-13T10:00:00Z"),
      ),
    ).toBe(3);
  });
});
