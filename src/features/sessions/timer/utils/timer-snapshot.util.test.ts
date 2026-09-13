import { describe, expect, it } from "vitest";
import type {
  ActiveSessionData,
  TimerSnapshot,
} from "@/features/sessions/types/session.types";
import {
  isTimerSnapshot,
  selectNewerTimerSnapshot,
} from "@/features/sessions/timer/utils/timer-snapshot.util";

const running = {
  id: "first",
  status: "RUNNING",
  accumulatedActiveMilliseconds: 0,
  runningSince: "2026-09-13T10:00:00Z",
} as ActiveSessionData;
const paused = {
  ...running,
  status: "PAUSED",
  accumulatedActiveMilliseconds: 1200,
  runningSince: null,
} as ActiveSessionData;

describe("canonical timer snapshots", () => {
  it("cannot undo a confirmed pause with an older running payload", () => {
    const current = { revision: 2, activeSession: paused };
    expect(
      selectNewerTimerSnapshot(current, {
        revision: 1,
        activeSession: running,
      }),
    ).toBe(current);
  });

  it("cannot clear a new session with an older empty snapshot", () => {
    const current = {
      revision: 4,
      activeSession: { ...running, id: "second" },
    };
    expect(
      selectNewerTimerSnapshot(current, { revision: 3, activeSession: null }),
    ).toBe(current);
  });

  it("accepts a newer completion and ignores equal-revision reads", () => {
    const current: TimerSnapshot = { revision: 2, activeSession: paused };
    const ended: TimerSnapshot = { revision: 3, activeSession: null };
    expect(selectNewerTimerSnapshot(current, ended)).toBe(ended);
    expect(
      selectNewerTimerSnapshot(current, { ...current, activeSession: running }),
    ).toBe(current);
  });

  it("rejects malformed acknowledgements and completed occupation", () => {
    expect(isTimerSnapshot({ revision: 0, activeSession: null })).toBe(true);
    expect(isTimerSnapshot({ revision: 1, activeSession: running })).toBe(true);
    expect(isTimerSnapshot({ revision: 2, activeSession: paused })).toBe(true);
    for (const value of [
      null,
      {},
      { revision: -1, activeSession: null },
      { revision: 0.5, activeSession: null },
      { revision: 3, activeSession: { ...paused, status: "COMPLETED" } },
      { revision: 3, activeSession: { ...paused, runningSince: "wrong" } },
    ])
      expect(isTimerSnapshot(value)).toBe(false);
  });
});
