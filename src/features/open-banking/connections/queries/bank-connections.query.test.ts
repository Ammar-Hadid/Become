import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankProviderError } from "../../providers/types/bank-provider.types";

const mocks = vi.hoisted(() => ({ configured: true, institutions: vi.fn() }));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: {} }));
vi.mock("../../config/open-banking.config", () => ({
  getOpenBankingConfig: () => ({ configured: mocks.configured }),
}));
vi.mock("../../providers/adapters/enable-banking.adapter", () => ({
  getBankDataProvider: () => ({ institutions: mocks.institutions }),
}));

import { getBankInstitutions } from "./bank-connections.query";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured = true;
});

describe("institution catalog readiness", () => {
  it("does not call the provider before server setup", async () => {
    mocks.configured = false;
    await expect(getBankInstitutions()).resolves.toEqual({
      status: "NOT_CONFIGURED",
      institutions: [],
    });
    expect(mocks.institutions).not.toHaveBeenCalled();
  });

  it("returns the authenticated catalog without changing institutions", async () => {
    const institutions = [
      {
        name: "Revolut",
        country: "LT",
        logoUrl: null,
        maximumConsentSeconds: 86400,
        requiredPsuHeaders: [],
      },
    ];
    mocks.institutions.mockResolvedValue(institutions);
    await expect(getBankInstitutions()).resolves.toEqual({
      status: "AVAILABLE",
      institutions,
    });
    expect(mocks.institutions).toHaveBeenCalledWith(["NL", "LT"]);
  });

  it.each([401, 403])(
    "keeps denied catalog access (%s) out of the page error boundary",
    async (status) => {
      mocks.institutions.mockRejectedValue(
        new BankProviderError("HTTP_" + status, status),
      );
      await expect(getBankInstitutions()).resolves.toEqual({
        status: "ACCESS_DENIED",
        institutions: [],
      });
    },
  );

  it("qualifies temporary provider unavailability without exposing its body", async () => {
    mocks.institutions.mockRejectedValue(
      new BankProviderError("UNAVAILABLE", 503),
    );
    await expect(getBankInstitutions()).resolves.toEqual({
      status: "UNAVAILABLE",
      institutions: [],
    });
  });

  it("keeps transport failures recoverable and excludes sensitive details", async () => {
    mocks.institutions.mockRejectedValue(
      new Error("sensitive provider details"),
    );
    await expect(getBankInstitutions()).resolves.toEqual({
      status: "UNAVAILABLE",
      institutions: [],
    });
  });
});
