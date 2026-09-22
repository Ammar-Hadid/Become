import { describe, expect, it } from "vitest";
import { resolveSessionEndForDuration } from "./session-end-correction.util";

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 1, 10, minutes));

describe("completed session duration correction", () => {
  it("places the corrected end after the requested amount of focused time", () => {
    const session = { startedAt: at(0), endedAt: at(50), pauses: [] };
    expect(resolveSessionEndForDuration(session, at(50), 0, at(59))).toEqual(
      at(0),
    );
    expect(
      resolveSessionEndForDuration(session, at(50), 20 * 60, at(59)),
    ).toEqual(at(20));
    expect(
      resolveSessionEndForDuration(session, at(50), 55 * 60, at(59)),
    ).toEqual(at(55));
  });

  it("skips recorded breaks when resolving the requested focused duration", () => {
    const session = {
      startedAt: at(0),
      endedAt: at(50),
      pauses: [{ startedAt: at(15), endedAt: at(25) }],
    };
    expect(
      resolveSessionEndForDuration(session, at(50), 20 * 60, at(59)),
    ).toEqual(at(30));
    expect(
      resolveSessionEndForDuration(session, at(50), 15 * 60, at(59)),
    ).toEqual(at(15));
    expect(
      resolveSessionEndForDuration(session, at(50), 10 * 60, at(59)),
    ).toEqual(at(10));
  });

  it("keeps the original timestamp when the displayed seconds are unchanged", () => {
    const session = {
      startedAt: at(0),
      endedAt: new Date(at(20).getTime() + 250),
      pauses: [],
    };
    expect(
      resolveSessionEndForDuration(session, session.endedAt, 1200, at(59)),
    ).toEqual(session.endedAt);
  });

  it("rejects stale edits and impossible durations", () => {
    const session = {
      startedAt: at(0),
      endedAt: at(30),
      pauses: [{ startedAt: at(10), endedAt: at(20) }],
    };
    expect(resolveSessionEndForDuration(session, at(29), 1200, at(50))).toBe(
      "conflict",
    );
    expect(resolveSessionEndForDuration(session, at(30), -1, at(50))).toBe(
      "invalid-duration",
    );
    expect(resolveSessionEndForDuration(session, at(30), 40.5, at(50))).toBe(
      "invalid-duration",
    );
    expect(resolveSessionEndForDuration(session, at(30), 41 * 60, at(50))).toBe(
      "invalid-duration",
    );
  });
});
