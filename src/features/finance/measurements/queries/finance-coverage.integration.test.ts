import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
let prisma: typeof import("@/lib/db/adapters/prisma.adapter").prisma;
let getFinanceCoverage: typeof import("./finance-coverage.query").getFinanceCoverage;
let previewStatementImport: typeof import("@/features/finance/statements/services/statement-import.service").previewStatementImport;
let confirmStatementImport: typeof import("@/features/finance/statements/services/statement-import.service").confirmStatementImport;

describe.skipIf(process.env.RUN_FINANCE_INTEGRATION !== "1")(
  "Finance coverage activation (isolated PostgreSQL)",
  () => {
    let userId: string;
    let accountId: string;
    const at = new Date();
    const on = DateTime.fromJSDate(at).setZone("Europe/Amsterdam").toISODate()!;
    beforeAll(async () => {
      if (
        !process.env.DATABASE_URL ||
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL).hostname,
        )
      )
        throw new Error("These tests require isolated local PostgreSQL.");
      ({ prisma } = await import("@/lib/db/adapters/prisma.adapter"));
      ({ getFinanceCoverage } = await import("./finance-coverage.query"));
      ({ previewStatementImport, confirmStatementImport } =
        await import("@/features/finance/statements/services/statement-import.service"));
    });
    beforeEach(async () => {
      userId = (
        await prisma.user.create({
          data: {
            name: "Coverage activation test",
            email: `coverage-${randomUUID()}@example.test`,
          },
        })
      ).id;
      accountId = (
        await prisma.financialAccount.create({
          data: { userId, name: "Daily", type: "CHECKING", currency: "EUR" },
        })
      ).id;
    });
    afterEach(async () => {
      if (!userId) return;
      await prisma.financialEvidenceLink.deleteMany({ where: { userId } });
      await prisma.financialEvidenceObservation.deleteMany({
        where: { userId },
      });
      await prisma.financialStatementImport.deleteMany({ where: { userId } });
      await prisma.financialTransaction.deleteMany({ where: { userId } });
      await prisma.financialAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    });
    afterAll(() => prisma?.$disconnect());
    const preview = () =>
      previewStatementImport(
        userId,
        accountId,
        {
          name: "draft.csv",
          data: new TextEncoder().encode(
            `Date,Amount,Description,Counterparty\n${on},-12.00,Card purchase,Shop\n`,
          ),
        },
        {
          date: "Date",
          amount: "Amount",
          description: "Description",
          counterparty: "Counterparty",
        },
      );

    it("keeps a staged statement preview out of live coverage until import confirmation", async () => {
      const before = await getFinanceCoverage(userId, undefined, at);
      const batch = await preview();
      expect(
        await prisma.financialEvidenceLink.count({
          where: {
            userId,
            status: "STAGED",
            observation: { importId: batch.id },
          },
        }),
      ).toBe(1);
      expect(await getFinanceCoverage(userId, undefined, at)).toEqual(before);
      await confirmStatementImport(userId, batch.id);
      const confirmed = await getFinanceCoverage(userId, undefined, at);
      expect(confirmed.sourceCounts).toEqual([
        { source: "STATEMENT_IMPORT", count: 1 },
      ]);
      expect(confirmed.accounts[0].coverageThroughOn).toBe(on);
      expect(confirmed.unreviewedCount).toBe(1);
    });

    it("keeps draft overlap questions out of coverage while retaining unmapped live-bank uncertainty", async () => {
      await prisma.financialTransaction.create({
        data: {
          userId,
          accountId,
          type: "EXPENSE",
          amountMinor: 1200n,
          currency: "EUR",
          activityOn: on,
          occurredAt: DateTime.fromISO(on, { zone: "Europe/Amsterdam" })
            .toUTC()
            .toJSDate(),
        },
      });
      const before = await getFinanceCoverage(userId, undefined, at);
      const batch = await preview();
      expect(
        await prisma.financialEvidenceLink.count({
          where: {
            userId,
            status: "DUPLICATE_REVIEW",
            observation: { importId: batch.id },
          },
        }),
      ).toBe(1);
      expect(await getFinanceCoverage(userId, undefined, at)).toEqual(before);
      const observation = await prisma.financialEvidenceObservation.create({
        data: {
          userId,
          source: "LIVE_SYNC",
          evidenceKey: randomUUID(),
          payloadHash: randomUUID(),
          fingerprint: randomUUID(),
          bookingStatus: "BOOKED",
          direction: "DEBIT",
          amountMinor: 500n,
          currency: "EUR",
          activityOn: on,
          occurredAt: at,
          raw: {},
        },
      });
      await prisma.financialEvidenceLink.create({
        data: { userId, observationId: observation.id, status: "STAGED" },
      });
      const bankGap = await getFinanceCoverage(userId, undefined, at);
      expect(bankGap.unresolvedEvidenceCount).toBe(1);
      expect(bankGap.complete).toBe(false);
    });
  },
);
