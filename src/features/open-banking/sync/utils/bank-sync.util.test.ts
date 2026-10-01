import { describe, expect, it } from "vitest";
import { BankProviderError } from "../../providers/types/bank-provider.types";
import {
  bankRequiresReauthorization,
  bankRetryDate,
  bankSyncCursorSchema,
  bankSyncDateBounds,
} from "./bank-sync.util";

describe("bank synchronization policy", () => {
  const now = new Date("2026-10-01T08:00:00Z");
  it("fetches the Finance-local new day before UTC midnight, including daylight-saving boundaries", () => {
    expect(
      bankSyncDateBounds(
        true,
        null,
        new Date("2026-10-01T22:30:00Z"),
        "Europe/Amsterdam",
      ),
    ).toEqual({ dateTo: "2026-10-02" });
    expect(
      bankSyncDateBounds(
        true,
        null,
        new Date("2026-03-28T23:30:00Z"),
        "Europe/Amsterdam",
      ),
    ).toEqual({ dateTo: "2026-03-29" });
  });
  it("persists a catch-up boundary earlier than the correction overlap after downtime", () => {
    expect(
      bankSyncDateBounds(
        false,
        new Date("2026-01-10T23:30:00Z"),
        new Date("2026-10-01T22:30:00Z"),
        "Europe/Amsterdam",
      ),
    ).toEqual({ dateFrom: "2026-01-04", dateTo: "2026-10-02" });
  });
  it("honors provider retry instructions independently of configured cadence", () => {
    expect(
      bankRetryDate(
        new BankProviderError(
          "ASPSP_RATE_LIMIT_EXCEEDED",
          429,
          new Date("2026-10-01T20:00:00Z"),
        ),
        1,
        3600,
        now,
      ).toISOString(),
    ).toBe("2026-10-01T20:00:00.000Z");
  });
  it("uses the institution cadence when a quota response has no retry instruction", () => {
    expect(
      bankRetryDate(
        new BankProviderError("ASPSP_RATE_LIMIT_EXCEEDED", 429),
        1,
        7200,
        now,
      ).toISOString(),
    ).toBe("2026-10-01T10:00:00.000Z");
  });
  it("backs off transient failures while distinguishing expired consent", () => {
    expect(
      bankRetryDate(new Error("network"), 1, 21600, now).toISOString(),
    ).toBe("2026-10-01T08:01:00.000Z");
    expect(
      bankRetryDate(new Error("network"), 4, 21600, now).toISOString(),
    ).toBe("2026-10-01T12:00:00.000Z");
    expect(
      bankRequiresReauthorization(
        new BankProviderError("SESSION_EXPIRED", 403),
      ),
    ).toBe(true);
    expect(
      bankRequiresReauthorization(new BankProviderError("ASPSP_ERROR", 500)),
    ).toBe(false);
  });
  it("retains pagination even for an empty page with a continuation", () => {
    const cursor = {
      accountIds: ["external"],
      accountIndex: 0,
      phase: "TRANSACTIONS",
      page: 2,
      continuationKey: "continue",
      dateTo: "2026-10-01",
      longestHistory: true,
    };
    expect(bankSyncCursorSchema.parse(cursor)).toEqual(cursor);
  });
});
