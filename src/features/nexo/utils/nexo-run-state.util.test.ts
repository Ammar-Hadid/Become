import { describe, expect, it } from "vitest";
import { nexoRunDisplayState } from "./nexo-run-state.util";
const run = {
  status: "PENDING",
  error: null,
  createdAt: new Date("2026-09-22T12:00:00Z"),
  configSnapshot: { profile: { timeoutSeconds: 30 } },
};
describe("Nexo operation deadlines", () => {
  it("uses the captured provider timeout plus a short transport grace", () => {
    expect(
      nexoRunDisplayState(run, run.createdAt.getTime() + 39000).status,
    ).toBe("PENDING");
    expect(
      nexoRunDisplayState(run, run.createdAt.getTime() + 41000).status,
    ).toBe("FAILED");
  });
  it("never replaces a completed, discarded or failed result", () => {
    for (const status of ["READY", "ACCEPTED", "DISCARDED", "FAILED"])
      expect(
        nexoRunDisplayState(
          { ...run, status, error: "Retained result" },
          run.createdAt.getTime() + 900000,
        ),
      ).toEqual({ status, error: "Retained result" });
  });
});
