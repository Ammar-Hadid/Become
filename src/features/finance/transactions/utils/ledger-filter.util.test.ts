import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { ledgerDateRange } from "./ledger-filter.util";

describe("ledger calendar filtering", () => {
  const now = DateTime.fromISO("2026-10-27T14:00:00", {
    zone: "Europe/Amsterdam",
  });
  it("keeps all time unbounded and ignores unsupported ranges", () => {
    expect(ledgerDateRange({}, now)).toBeUndefined();
    expect(
      ledgerDateRange({ period: "unknown", date: "invalid" }, now),
    ).toBeUndefined();
  });
  it("filters a calendar day across the daylight-saving change", () => {
    const result = ledgerDateRange({ date: "2026-10-25", period: "7D" }, now)!;
    expect(result.gte.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(result.lt.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(result.lt.getTime() - result.gte.getTime()).toBe(
      25 * 60 * 60 * 1000,
    );
  });
  it("includes today in the seven-day view", () => {
    const result = ledgerDateRange({ period: "7D" }, now)!;
    expect(result.gte.toISOString()).toBe("2026-10-20T22:00:00.000Z");
    expect(result.lt.toISOString()).toBe("2026-10-27T23:00:00.000Z");
  });
  it("falls back to the selected period for an impossible date", () => {
    expect(ledgerDateRange({ date: "2026-02-30", period: "1D" }, now)).toEqual(
      ledgerDateRange({ period: "1D" }, now),
    );
  });
});
