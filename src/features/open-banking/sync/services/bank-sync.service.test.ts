import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankProviderError } from "../../providers/types/bank-provider.types";

const mocks = vi.hoisted(() => {
  const database = {
    $queryRaw: vi.fn(),
    bankSyncJob: { updateMany: vi.fn(), update: vi.fn() },
    bankConnection: { updateMany: vi.fn() },
    externalBankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    database,
    transaction: vi.fn(),
    evidence: vi.fn(),
    balance: vi.fn(),
    materialize: vi.fn(),
    provider: { balances: vi.fn(), transactions: vi.fn() },
  };
});
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({
  prisma: { ...mocks.database, $transaction: mocks.transaction },
}));
vi.mock(
  "@/features/finance/evidence/services/financial-evidence.service",
  () => ({
    ingestFinancialEvidence: mocks.evidence,
    ingestFinancialBalance: mocks.balance,
  }),
);
vi.mock(
  "@/features/finance/accounts/services/bank-account-mapping.service",
  () => ({ materializeMappedEvidence: mocks.materialize }),
);
vi.mock("../../providers/adapters/enable-banking.adapter", () => ({
  getBankDataProvider: () => mocks.provider,
}));
vi.mock("../../config/open-banking.config", () => ({
  bankSyncCadenceSeconds: () => 7200,
  getOpenBankingConfig: () => ({ configured: true }),
}));
import { runNextBankSynchronization } from "./bank-sync.service";

const job = {
  id: "job-1",
  userId: "owner",
  connectionId: "connection",
  externalAccountId: null,
  leaseToken: "lease",
  attempts: 1,
  cursor: null,
  arguments: { longestHistory: true },
  connection: {
    provider: "ENABLE_BANKING",
    institutionCountry: "NL",
    institutionName: "ING",
    lastSuccessAt: null,
  },
};
const observation = {
  reference: "stable",
  fingerprint: "fingerprint",
  status: "BOOKED",
  direction: "DEBIT",
  amountMinor: 8742n,
  currency: "EUR",
  activityDate: "2026-10-01",
  counterpartyIdentity: "merchant",
  raw: {},
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((callback) => callback(mocks.database));
  mocks.database.$queryRaw.mockImplementation(
    (strings: TemplateStringsArray) => {
      const sql = strings.join("?");
      return sql.includes("pg_advisory_xact_lock") ? [] : [{ id: "job-1" }];
    },
  );
  mocks.database.bankSyncJob.update.mockResolvedValue(job);
  mocks.database.bankSyncJob.updateMany.mockResolvedValue({ count: 1 });
  mocks.database.bankConnection.updateMany.mockResolvedValue({ count: 1 });
  mocks.database.externalBankAccount.findMany.mockResolvedValue([
    { id: "external" },
  ]);
  mocks.database.externalBankAccount.findFirst.mockResolvedValue({
    id: "external",
    providerAccountId: "api-account",
    userId: "owner",
  });
  mocks.materialize.mockResolvedValue({ more: false });
  mocks.provider.balances.mockResolvedValue([]);
});

describe("durable bank synchronization", () => {
  it("advances an empty continuation page, retains query bounds and posts the next page once", async () => {
    mocks.provider.transactions
      .mockResolvedValueOnce({ observations: [], continuationKey: "next" })
      .mockResolvedValueOnce({
        observations: [observation],
        continuationKey: null,
      });
    expect(await runNextBankSynchronization()).toBe(true);
    expect(mocks.provider.transactions).toHaveBeenCalledTimes(2);
    expect(mocks.provider.transactions.mock.calls[1][0]).toMatchObject({
      accountId: "api-account",
      continuationKey: "next",
      longestHistory: true,
    });
    expect(mocks.provider.transactions.mock.calls[0][0].dateTo).toBe(
      mocks.provider.transactions.mock.calls[1][0].dateTo,
    );
    expect(mocks.evidence).toHaveBeenCalledExactlyOnceWith(
      "owner",
      expect.objectContaining({
        source: "LIVE_SYNC",
        externalAccountId: "external",
        amountMinor: 8742n,
      }),
      mocks.database,
    );
    expect(mocks.database.bankSyncJob.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      }),
    );
  });
  it("queues a retry with provider retry-after while retaining committed balance cursor", async () => {
    const retryAt = new Date(Date.now() + 12 * 3600_000);
    mocks.provider.transactions.mockRejectedValue(
      new BankProviderError("ASPSP_RATE_LIMIT_EXCEEDED", 429, retryAt),
    );
    await runNextBankSynchronization();
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.database.bankSyncJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "QUEUED",
          nextAttemptAt: retryAt,
          lastError: "ASPSP_RATE_LIMIT_EXCEEDED",
        }),
      }),
    );
  });
  it("rejects a lost lease before posting a fetched transaction page", async () => {
    mocks.provider.transactions.mockResolvedValue({
      observations: [observation],
      continuationKey: null,
    });
    let checks = 0;
    mocks.database.$queryRaw.mockImplementation(
      (strings: TemplateStringsArray) => {
        const sql = strings.join("?");
        if (sql.includes("FOR NO KEY UPDATE OF j,c") && ++checks >= 3)
          return [];
        return sql.includes("pg_advisory_xact_lock") ? [] : [{ id: "job-1" }];
      },
    );
    await runNextBankSynchronization();
    expect(mocks.evidence).not.toHaveBeenCalled();
  });
  it("materializes mapped evidence without making network requests or claiming fresh bank balances", async () => {
    mocks.database.bankSyncJob.update.mockResolvedValue({
      ...job,
      externalAccountId: "external",
      arguments: { materializeOnly: true },
    });
    mocks.materialize.mockResolvedValue({ more: true });
    await runNextBankSynchronization();
    expect(mocks.provider.transactions).not.toHaveBeenCalled();
    expect(mocks.provider.balances).not.toHaveBeenCalled();
    expect(mocks.database.bankSyncJob.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "QUEUED" }),
      }),
    );
  });
});
