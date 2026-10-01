import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  connection: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  external: { findUnique: vi.fn(), upsert: vi.fn() },
  job: { updateMany: vi.fn(), create: vi.fn() },
  transaction: vi.fn(),
  complete: vi.fn(),
  enqueue: vi.fn(),
}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({
  prisma: { bankConnection: mocks.connection, $transaction: mocks.transaction },
}));
vi.mock("../../providers/adapters/enable-banking.adapter", () => ({
  getBankDataProvider: () => ({ completeAuthorization: mocks.complete }),
}));
vi.mock("../../sync/services/bank-sync.service", () => ({
  enqueueBankSynchronization: mocks.enqueue,
}));
import { completeBankAuthorization } from "./bank-connection.service";

const connection = {
  id: "connection",
  userId: "owner",
  provider: "ENABLE_BANKING",
  institutionName: "Revolut",
  institutionCountry: "LT",
};
const state = "x".repeat(43);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.connection.findFirst.mockResolvedValue(connection);
  mocks.connection.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation((callback) =>
    callback({
      bankConnection: mocks.connection,
      externalBankAccount: mocks.external,
      bankSyncJob: mocks.job,
    }),
  );
  mocks.complete.mockResolvedValue({
    sessionId: "new-session",
    expiresAt: new Date(Date.now() + 86400_000),
    institution: { name: "Revolut", country: "LT" },
    accounts: [
      {
        providerAccountId: "new-api-id",
        identityKey: "persistent",
        currency: "EUR",
        externalType: "CURRENT",
        identityAliases: [],
        maskedIdentifier: "•••• 1234",
      },
    ],
  });
  mocks.external.findUnique.mockResolvedValue({
    id: "existing",
    currency: "EUR",
    financialAccountId: "savings",
    externalType: "CURRENT",
  });
});

describe("bank authorization ownership and reconnect", () => {
  it("does not exchange a callback for a different or absent user-owned state", async () => {
    mocks.connection.findFirst.mockResolvedValue(null);
    await expect(
      completeBankAuthorization("another-user", {
        state,
        code: "one-use-code",
      }),
    ).rejects.toThrow("already been used or expired");
    expect(mocks.connection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "another-user" }),
      }),
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("claims the authorization once before exchanging the code", async () => {
    mocks.connection.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      completeBankAuthorization("owner", { state, code: "code" }),
    ).rejects.toThrow("already been used");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("replaces session handles without changing the existing Become mapping or Savings classification", async () => {
    await completeBankAuthorization("owner", { state, code: "code" });
    expect(mocks.external.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_provider_identityKey: {
            userId: "owner",
            provider: "ENABLE_BANKING",
            identityKey: "persistent",
          },
        },
        update: expect.objectContaining({
          providerAccountId: "new-api-id",
          authorizedSessionId: "new-session",
          externalType: "CURRENT",
        }),
      }),
    );
    const update = mocks.external.upsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty("financialAccountId");
    expect(update).not.toHaveProperty("type");
    expect(update).not.toHaveProperty("name");
    expect(mocks.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger: "INITIAL",
          arguments: { longestHistory: true },
        }),
      }),
    );
  });
  it("does not accept a changed currency for an existing mapped account", async () => {
    mocks.external.findUnique.mockResolvedValue({
      id: "existing",
      currency: "USD",
      financialAccountId: "savings",
    });
    await expect(
      completeBankAuthorization("owner", { state, code: "code" }),
    ).rejects.toThrow("changed an account currency");
    expect(mocks.external.upsert).not.toHaveBeenCalled();
  });
});
