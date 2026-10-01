import { describe, expect, it } from "vitest";
import {
  evidenceDay,
  evidenceHash,
  activityDay,
} from "./financial-evidence.util";
describe("evidence dates and identities", () => {
  it("keeps date-only precision at Amsterdam midnight across DST", () => {
    expect(evidenceDay("2026-03-29").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(evidenceDay("2026-03-30").toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
    expect(activityDay(evidenceDay("2026-03-30"), "2026-03-30")).toBe(
      "2026-03-30",
    );
  });
  it("rejects impossible days", () => {
    expect(() => evidenceDay("2026-02-30")).toThrow();
  });
  it("stable hashes preserve changes and exact integer money", () => {
    expect(evidenceHash({ b: 1, a: 9007199254740993n })).toBe(
      evidenceHash({ a: 9007199254740993n, b: 1 }),
    );
    expect(evidenceHash({ amount: 8742n })).not.toBe(
      evidenceHash({ amount: 10000n }),
    );
  });
});
