import { describe, expect, it } from "vitest";
import { validateSessionEndCorrection } from "./session-end-correction.util";

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 1, 10, minutes));

describe("completed session end correction", () => {
  it("allows an earlier or later actual stop time within the session and current time", () => {
    expect(
      validateSessionEndCorrection(at(0), at(50), at(50), at(20), at(59)),
    ).toBeNull();
    expect(
      validateSessionEndCorrection(at(0), at(30), at(30), at(45), at(59)),
    ).toBeNull();
  });

  it("rejects stale edits and times before the start or in the future", () => {
    expect(
      validateSessionEndCorrection(at(0), at(30), at(50), at(20), at(59)),
    ).toBe("conflict");
    expect(
      validateSessionEndCorrection(at(10), at(30), at(30), at(0), at(59)),
    ).toBe("invalid-end");
    expect(
      validateSessionEndCorrection(at(0), at(30), at(30), at(59), at(50)),
    ).toBe("invalid-end");
  });
});
