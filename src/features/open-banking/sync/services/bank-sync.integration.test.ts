import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  BankProviderError,
  type BankTransactionObservation,
} from "../../providers/types/bank-provider.types";
const mocks = vi.hoisted(() => ({ balances: vi.fn(), transactions: vi.fn() }));
vi.mock("../../providers/adapters/enable-banking.adapter", () => ({
  getBankDataProvider: () => mocks,
}));
vi.mock("../../config/open-banking.config", () => ({
  bankSyncCadenceSeconds: () => 7200,
  getOpenBankingConfig: () => ({ configured: true }),
}));
let prisma: typeof import("@/lib/db/adapters/prisma.adapter").prisma;
let enqueueBankSynchronization: typeof import("./bank-sync.service").enqueueBankSynchronization;
let runNextBankSynchronization: typeof import("./bank-sync.service").runNextBankSynchronization;
let scheduleDueBankSynchronizations: typeof import("./bank-sync.service").scheduleDueBankSynchronizations;

const observation = (reference = "stable"): BankTransactionObservation => ({
  reference,
  fingerprint: "same-fingerprint",
  status: "BOOKED",
  direction: "DEBIT",
  amountMinor: 8742n,
  currency: "EUR",
  activityDate: "2026-10-01",
  bookingDate: "2026-10-01",
  valueDate: null,
  datePrecision: "DATE",
  counterpartyName: "Merchant",
  counterpartyIdentity: "merchant",
  ownCounterpartyIdentity: null,
  description: "Purchase",
  raw: {},
});

describe.skipIf(process.env.RUN_OPEN_BANKING_INTEGRATION !== "1")(
  "Bank worker (isolated PostgreSQL)",
  () => {
    let userId: string;
    let connectionId: string;
    let externalId: string;
    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.pathname !== "/become_open_banking_test"
      )
        throw new Error(
          "Bank worker tests require the isolated local become_open_banking_test database.",
        );
      prisma = (await import("@/lib/db/adapters/prisma.adapter")).prisma;
      const sync = await import("./bank-sync.service");
      enqueueBankSynchronization = sync.enqueueBankSynchronization;
      runNextBankSynchronization = sync.runNextBankSynchronization;
      scheduleDueBankSynchronizations = sync.scheduleDueBankSynchronizations;
    });
    beforeEach(async () => {
      vi.resetAllMocks();
      userId = "";
      userId = (
        await prisma.user.create({
          data: {
            name: "Bank worker fixture",
            email: `bank-worker-${randomUUID()}@example.test`,
          },
        })
      ).id;
      const connection = await prisma.bankConnection.create({
        data: {
          userId,
          provider: "ENABLE_BANKING",
          institutionName: "ING",
          institutionCountry: "NL",
          status: "CONNECTED",
          sessionId: "fixture-session",
          consentExpiresAt: new Date(Date.now() + 86400_000),
        },
      });
      connectionId = connection.id;
      externalId = (
        await prisma.externalBankAccount.create({
          data: {
            userId,
            connectionId,
            provider: "ENABLE_BANKING",
            identityKey: randomUUID(),
            providerAccountId: "api-fixture",
            authorizedSessionId: "fixture-session",
            currency: "EUR",
            externalType: "CURRENT",
          },
        })
      ).id;
      mocks.balances.mockResolvedValue([]);
      mocks.transactions.mockResolvedValue({
        observations: [],
        continuationKey: null,
      });
    });
    afterEach(async () => {
      if (!prisma || !userId) return;
      const where = { userId };
      await prisma.financialEvidenceLink.deleteMany({ where });
      await prisma.financialEvidenceObservation.deleteMany({ where });
      await prisma.financialBalanceObservation.deleteMany({ where });
      await prisma.bankSyncJob.deleteMany({ where });
      await prisma.externalBankAccount.deleteMany({ where });
      await prisma.bankConnection.deleteMany({ where });
      await prisma.user.delete({ where: { id: userId } });
    });
    afterAll(() => prisma?.$disconnect());
    const initialJob = () =>
      prisma.bankSyncJob.create({
        data: {
          userId,
          connectionId,
          trigger: "INITIAL",
          nextAttemptAt: new Date("2000-01-01T00:00:00Z"),
          arguments: { longestHistory: true },
        },
      });

    it("serializes competing worker claims and commits staged evidence with its cursor", async () => {
      await initialJob();
      let announce: () => void = () => undefined;
      let release: () => void = () => undefined;
      const entered = new Promise<void>((resolve) => {
        announce = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      mocks.balances.mockImplementation(async () => {
        announce();
        await held;
        return [];
      });
      mocks.transactions.mockResolvedValue({
        observations: [observation()],
        continuationKey: null,
      });
      const first = runNextBankSynchronization();
      await entered;
      expect(await runNextBankSynchronization()).toBe(false);
      expect(
        await prisma.bankSyncJob.count({
          where: { userId, status: "RUNNING" },
        }),
      ).toBe(1);
      release();
      await first;
      expect(
        await prisma.bankSyncJob.count({
          where: { userId, status: "SUCCEEDED" },
        }),
      ).toBe(1);
      const staged = await prisma.financialEvidenceObservation.findMany({
        where: { userId },
        include: { link: true },
      });
      expect(staged).toHaveLength(1);
      expect(staged[0].externalAccountId).toBe(externalId);
      expect(staged[0].link?.status).toBe("STAGED");
    });
    it("allows a Finance transaction to enqueue a connection job while worker ingestion waits for its advisory lock", async () => {
      const job = await initialJob();
      await prisma.bankSyncJob.update({
        where: { id: job.id },
        data: {
          cursor: {
            accountIds: [externalId],
            accountIndex: 0,
            phase: "TRANSACTIONS",
            page: 0,
            longestHistory: true,
            dateTo: "2026-10-01",
          },
        },
      });
      mocks.transactions.mockResolvedValue({
        observations: [observation()],
        continuationKey: null,
      });
      let worker: Promise<boolean> | undefined;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
          worker = runNextBankSynchronization();
          let workerWaiting = false;
          for (let attempt = 0; attempt < 100; attempt += 1) {
            await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
            const [waiting] = await tx.$queryRaw<Array<{ count: number }>>`
              SELECT count(*)::int AS count FROM pg_stat_activity
              WHERE wait_event = 'advisory'
                AND pg_backend_pid() = ANY(pg_blocking_pids(pid))
            `;
            if (waiting.count > 0) {
              workerWaiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(workerWaiting).toBe(true);
          // This FK needs connection KEY SHARE, which must coexist with the lease lock.
          await tx.bankSyncJob.create({
            data: {
              userId,
              connectionId,
              trigger: "INITIAL",
              arguments: { materializeOnly: true },
              externalAccountId: externalId,
            },
          });
        });
      } finally {
        await worker;
      }
      expect(
        await prisma.bankSyncJob.count({
          where: { userId, status: "SUCCEEDED" },
        }),
      ).toBe(1);
    });
    it("resumes a persisted transaction cursor after quota backoff without refetching balances", async () => {
      const job = await initialJob();
      mocks.transactions.mockRejectedValueOnce(
        new BankProviderError(
          "ASPSP_RATE_LIMIT_EXCEEDED",
          429,
          new Date(Date.now() + 7200_000),
        ),
      );
      await runNextBankSynchronization();
      const deferred = await prisma.bankSyncJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      expect(deferred.status).toBe("QUEUED");
      expect(deferred.cursor).toMatchObject({ phase: "TRANSACTIONS" });
      expect(deferred.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
      await prisma.bankSyncJob.update({
        where: { id: job.id },
        data: { nextAttemptAt: new Date("2000-01-01T00:00:00Z") },
      });
      await prisma.bankConnection.update({
        where: { id: connectionId },
        data: { nextEligibleAt: new Date("2000-01-01T00:00:00Z") },
      });
      mocks.transactions.mockResolvedValue({
        observations: [observation()],
        continuationKey: null,
      });
      await runNextBankSynchronization();
      expect(mocks.balances).toHaveBeenCalledTimes(1);
      expect(
        await prisma.financialEvidenceObservation.count({ where: { userId } }),
      ).toBe(1);
      expect(
        (await prisma.bankSyncJob.findUniqueOrThrow({ where: { id: job.id } }))
          .attempts,
      ).toBe(2);
    });
    it("reclaims an expired lease with its exact continuation and date scope", async () => {
      await prisma.bankSyncJob.create({
        data: {
          userId,
          connectionId,
          trigger: "INITIAL",
          status: "RUNNING",
          leaseToken: "abandoned",
          leasedUntil: new Date("2000-01-01T00:00:00Z"),
          nextAttemptAt: new Date("2000-01-01T00:00:00Z"),
          cursor: {
            accountIds: [externalId],
            accountIndex: 0,
            phase: "TRANSACTIONS",
            page: 3,
            continuationKey: "saved-page",
            dateFrom: "2026-07-01",
            dateTo: "2026-10-01",
            longestHistory: false,
          },
        },
      });
      await runNextBankSynchronization();
      expect(mocks.balances).not.toHaveBeenCalled();
      expect(mocks.transactions).toHaveBeenCalledWith({
        accountId: "api-fixture",
        continuationKey: "saved-page",
        dateFrom: "2026-07-01",
        dateTo: "2026-10-01",
        longestHistory: false,
      });
      expect(
        await prisma.bankSyncJob.count({
          where: { userId, status: "SUCCEEDED" },
        }),
      ).toBe(1);
    });
    it("keeps indistinguishable no-reference rows as separate observations", async () => {
      await initialJob();
      const noReference = { ...observation(), reference: null };
      mocks.transactions.mockResolvedValue({
        observations: [noReference, noReference],
        continuationKey: null,
      });
      await runNextBankSynchronization();
      expect(
        await prisma.financialEvidenceObservation.count({ where: { userId } }),
      ).toBe(2);
    });
    it("configures cadence separately from Sync now and respects persisted retry eligibility", async () => {
      await prisma.bankConnection.update({
        where: { id: connectionId },
        data: { lastSuccessAt: new Date(Date.now() - 3600_000) },
      });
      await scheduleDueBankSynchronizations();
      expect(await prisma.bankSyncJob.count({ where: { userId } })).toBe(0);
      const retryAt = new Date(Date.now() + 3600_000);
      await prisma.bankConnection.update({
        where: { id: connectionId },
        data: { nextEligibleAt: retryAt },
      });
      const result = await enqueueBankSynchronization(
        userId,
        connectionId,
        "USER",
      );
      expect(result.more).toBe(true);
      expect(
        (
          await prisma.bankSyncJob.findUniqueOrThrow({
            where: { id: result.id },
          })
        ).nextAttemptAt,
      ).toEqual(retryAt);
      expect(await runNextBankSynchronization()).toBe(false);
      expect(mocks.transactions).not.toHaveBeenCalled();
    });
    it("never fetches stale provider handles for accounts omitted from the current consent", async () => {
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { authorizedSessionId: "old-session" },
      });
      await initialJob();
      await runNextBankSynchronization();
      expect(mocks.balances).not.toHaveBeenCalled();
      expect(mocks.transactions).not.toHaveBeenCalled();
    });
  },
);
