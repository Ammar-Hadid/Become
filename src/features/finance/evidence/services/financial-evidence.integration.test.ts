import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
} from "vitest";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  ingestFinancialEvidence,
  ingestFinancialBalance,
  resolveFinancialEvidence,
} from "./financial-evidence.service";
import {
  materializeMappedEvidence,
  mapExternalFinancialAccount,
} from "@/features/finance/accounts/services/bank-account-mapping.service";
import { updateCreditCardConfiguration } from "@/features/finance/accounts/services/credit-card-configuration.service";
import { createFinancialAccount } from "@/features/finance/accounts/services/financial-account.service";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { getFinanceActivity } from "@/features/finance/review/queries/finance-activity.query";
import {
  interpretFinancialTransaction,
  reviewFinancialTransactions,
} from "@/features/finance/review/services/financial-review.service";
import {
  saveFinancialTransaction,
  deleteFinancialTransaction,
} from "@/features/finance/transactions/services/financial-transaction.service";
import {
  previewStatementImport,
  confirmStatementImport,
} from "@/features/finance/statements/services/statement-import.service";
import {
  confirmEvidenceTransfer,
  classifyIncomingEvidence,
} from "./evidence-transfer.service";
import { linkExpectedIncomeTransaction } from "@/features/finance/forecast/services/expected-income-matching.service";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";
import { evidenceDay } from "../utils/financial-evidence.util";
const enabled = process.env.RUN_FINANCE_INTEGRATION === "1";
describe.skipIf(!enabled)(
  "one Finance evidence pipeline (isolated PostgreSQL)",
  () => {
    let userId: string,
      accountId: string,
      connectionId: string,
      externalId: string;
    beforeAll(() => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error("Use local isolated PostgreSQL.");
    });
    beforeEach(async () => {
      userId = (
        await prisma.user.create({
          data: {
            name: "Bank tests",
            email: `bank-${randomUUID()}@example.test`,
          },
        })
      ).id;
      accountId = (
        await prisma.financialAccount.create({
          data: {
            userId,
            name: "My everyday",
            type: "CHECKING",
            currency: "EUR",
            dataSource: "LIVE_SYNC",
          },
        })
      ).id;
      connectionId = (
        await prisma.bankConnection.create({
          data: {
            userId,
            provider: "TEST",
            institutionName: "Test bank",
            institutionCountry: "NL",
            status: "CONNECTED",
            sessionId: "session",
          },
        })
      ).id;
      externalId = (
        await prisma.externalBankAccount.create({
          data: {
            userId,
            connectionId,
            provider: "TEST",
            identityKey: randomUUID(),
            providerAccountId: "external",
            externalType: "CURRENT",
            currency: "EUR",
            financialAccountId: accountId,
          },
        })
      ).id;
    });
    afterEach(async () => {
      const where = { userId };
      await prisma.bankSyncJob.deleteMany({ where });
      await prisma.financialEvidenceLink.deleteMany({ where });
      await prisma.financialEvidenceObservation.deleteMany({ where });
      await prisma.financialBalanceObservation.deleteMany({ where });
      await prisma.savingsGoalExpenseAllocation.deleteMany({ where });
      await prisma.paymentSessionAllocation.deleteMany({ where });
      await prisma.businessReceiptAllocation.deleteMany({ where });
      await prisma.financialTransaction.deleteMany({ where });
      await prisma.financialStatementImport.deleteMany({ where });
      await prisma.financeExpectedIncome.deleteMany({ where });
      await prisma.recurringExpenseOccurrence.deleteMany({ where });
      await prisma.recurringExpense.deleteMany({ where });
      await prisma.externalBankAccount.deleteMany({ where });
      await prisma.bankConnection.deleteMany({ where });
      await prisma.savingsGoal.deleteMany({ where });
      await prisma.financialAccountBalanceSnapshot.deleteMany({ where });
      await prisma.financialAccount.deleteMany({ where });
      await prisma.counterpartyIdentity.deleteMany({ where });
      await prisma.counterparty.deleteMany({ where });
      await prisma.expenseCategory.deleteMany({ where });
      await prisma.financeCurrencyPolicy.deleteMany({ where });
      await prisma.user.delete({ where: { id: userId } });
    });
    afterAll(() => prisma.$disconnect());
    const input = (
      reference: string,
      amountMinor = 1000n,
      activityDate = financeToday().toISODate()!,
    ) => ({
      source: "LIVE_SYNC" as const,
      externalAccountId: externalId,
      reference,
      amountMinor,
      currency: "EUR",
      status: "BOOKED" as const,
      direction: "DEBIT" as const,
      activityDate,
      counterpartyName: "Unknown merchant",
      raw: { reference },
    });
    it("creates and maps a new live account without inventing a starting balance or overriding fetched bank evidence", async () => {
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { financialAccountId: null },
      });
      await ingestFinancialBalance(userId, {
        source: "LIVE_SYNC",
        externalAccountId: externalId,
        balanceMinor: 245000n,
        currency: "EUR",
        balanceType: "CLBD",
        observedAt: new Date(),
        includesPending: false,
        raw: {},
      });
      const created = await createFinancialAccount(userId, {
        name: "New Daily",
        bankName: "Test bank",
        type: "CHECKING",
        currency: "EUR",
        includeInLiquidSavings: false,
        dataSource: "LIVE_SYNC",
      });
      expect(
        await prisma.financialAccountBalanceSnapshot.count({
          where: { userId, accountId: created.id },
        }),
      ).toBe(0);
      expect(
        (await getFinancialPosition(userId)).find(
          (account) => account.id === created.id,
        )?.balanceMinor,
      ).toBeNull();
      await mapExternalFinancialAccount(userId, externalId, created.id);
      expect(
        (await getFinancialPosition(userId)).find(
          (account) => account.id === created.id,
        ),
      ).toMatchObject({ balanceMinor: 245000n, balanceSource: "LIVE_SYNC" });
      await expect(
        createFinancialAccount(userId, {
          name: "Manual unknown",
          type: "CHECKING",
          currency: "EUR",
          includeInLiquidSavings: false,
        }),
      ).rejects.toThrow("observed balance");
    });
    it("retries and concurrent ingestion converge; pending100 books87.42 once, corrections append", async () => {
      const pending = {
        ...input("payment", 10000n),
        status: "PENDING" as const,
      };
      await Promise.all([
        ingestFinancialEvidence(userId, pending),
        ingestFinancialEvidence(userId, pending),
      ]);
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(0);
      const first = await ingestFinancialEvidence(
        userId,
        input("payment", 8742n),
      );
      await ingestFinancialEvidence(userId, input("payment", 8742n));
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        (
          await prisma.financialTransaction.findUniqueOrThrow({
            where: { id: first.transactionId! },
          })
        ).amountMinor,
      ).toBe(8742n);
      const category = await prisma.expenseCategory.create({
        data: { userId, name: "Food", normalizedName: "food" },
      });
      await interpretFinancialTransaction(userId, {
        id: first.transactionId,
        categoryId: category.id,
        notes: "Keep this",
        tags: ["trip"],
      });
      await ingestFinancialEvidence(userId, input("payment", 8800n));
      const corrected = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: first.transactionId! },
      });
      expect(corrected).toMatchObject({
        amountMinor: 8800n,
        notes: "Keep this",
        tags: ["trip"],
        expenseCategoryId: category.id,
        reviewedAt: null,
      });
      expect(
        await prisma.financialEvidenceObservation.count({ where: { userId } }),
      ).toBe(3);
      await expect(
        prisma.financialEvidenceObservation.update({
          where: { id: first.id },
          data: { amountMinor: 1n },
        }),
      ).rejects.toThrow();
    });
    it("maps external CURRENT to existing Savings without changing reserve, allocations or inclusion", async () => {
      const savings = await prisma.financialAccount.create({
        data: {
          userId,
          name: "My nest",
          type: "SAVINGS",
          currency: "EUR",
          includeInLiquidSavings: true,
        },
      });
      await prisma.financialAccountBalanceSnapshot.create({
        data: {
          userId,
          accountId: savings.id,
          balanceMinor: 10000n,
          reconciledAt: new Date(Date.now() - 86400000),
        },
      });
      await prisma.financeCurrencyPolicy.create({
        data: { userId, currency: "EUR", protectedReserveMinor: 3000n },
      });
      const goal = await prisma.savingsGoal.create({
        data: {
          userId,
          name: "Laptop",
          currency: "EUR",
          targetAmountMinor: 5000n,
          allocatedAmountMinor: 2000n,
          accountId: savings.id,
        },
      });
      const revolut = await prisma.externalBankAccount.create({
        data: {
          userId,
          connectionId,
          provider: "TEST",
          identityKey: "revolut",
          providerAccountId: "revolut-eur",
          externalType: "CURRENT",
          currency: "EUR",
        },
      });
      await ingestFinancialBalance(userId, {
        source: "LIVE_SYNC",
        externalAccountId: revolut.id,
        balanceMinor: 10000n,
        currency: "EUR",
        balanceType: "CLBD",
        includesPending: false,
        observedAt: new Date(),
        raw: {},
      });
      const before = await getSavings(userId);
      await mapExternalFinancialAccount(userId, revolut.id, savings.id);
      const after = await getSavings(userId);
      expect(after.pools).toEqual(before.pools);
      expect(
        after.goals.find((x) => x.id === goal.id)?.allocatedAmountMinor,
      ).toBe(2000n);
      expect(
        await prisma.financialAccount.findUniqueOrThrow({
          where: { id: savings.id },
        }),
      ).toMatchObject({
        name: "My nest",
        type: "SAVINGS",
        includeInLiquidSavings: true,
        dataSource: "LIVE_SYNC",
      });
    });
    it("owned transfer is one event with no fabricated destination movement", async () => {
      const destination = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Savings",
          type: "SAVINGS",
          currency: "EUR",
          dataSource: "LIVE_SYNC",
        },
      });
      const other = await prisma.externalBankAccount.create({
        data: {
          userId,
          connectionId,
          provider: "TEST",
          identityKey: "savings",
          identityAliases: ["target"],
          providerAccountId: "savings",
          currency: "EUR",
          financialAccountId: destination.id,
        },
      });
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { identityAliases: ["source"] },
      });
      for (const id of [accountId, destination.id])
        await prisma.financialAccountBalanceSnapshot.create({
          data: {
            userId,
            accountId: id,
            balanceMinor: 100000n,
            reconciledAt: financeToday().minus({ days: 1 }).toJSDate(),
          },
        });
      await ingestFinancialEvidence(userId, {
        ...input("out", 50000n),
        status: "PENDING",
        ownCounterpartyIdentity: "target",
      });
      await ingestFinancialEvidence(userId, {
        ...input("out", 50000n),
        ownCounterpartyIdentity: "target",
      });
      expect(
        (await getFinancialPosition(userId)).find(
          (x) => x.id === destination.id,
        )?.balanceMinor,
      ).toBe(100000n);
      await ingestFinancialEvidence(userId, {
        ...input("in", 50000n),
        externalAccountId: other.id,
        direction: "CREDIT",
        ownCounterpartyIdentity: "source",
      });
      const events = await prisma.financialTransaction.findMany({
        where: { userId },
      });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("TRANSFER");
      expect(
        await prisma.financialEvidenceLink.count({
          where: {
            userId,
            status: "PROJECTED",
            observation: { bookingStatus: "PENDING" },
          },
        }),
      ).toBe(0);
      expect(
        (await getFinancialPosition(userId)).find(
          (x) => x.id === destination.id,
        )?.balanceMinor,
      ).toBe(150000n);
    });
    it("quarantines a manual owned transfer overlap and keeps repeated stable transfers distinct", async () => {
      const destination = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Reserve",
          type: "SAVINGS",
          currency: "EUR",
          dataSource: "LIVE_SYNC",
        },
      });
      const other = await prisma.externalBankAccount.create({
        data: {
          userId,
          connectionId,
          provider: "TEST",
          identityKey: "reserve",
          identityAliases: ["target"],
          providerAccountId: "reserve",
          currency: "EUR",
          financialAccountId: destination.id,
        },
      });
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { identityAliases: ["source"] },
      });
      const manual = await prisma.financialTransaction.create({
        data: {
          userId,
          accountId,
          destinationAccountId: destination.id,
          currency: "EUR",
          amountMinor: 50000n,
          type: "TRANSFER",
          occurredAt: evidenceDay(financeToday().toISODate()!),
          notes: "Existing reserve transfer",
        },
      });
      const out = await ingestFinancialEvidence(userId, {
        ...input("first-out", 50000n),
        ownCounterpartyIdentity: "target",
      });
      expect(out.transactionId).toBeNull();
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.financialEvidenceLink.findUniqueOrThrow({
          where: { observationId: out.id },
        }),
      ).toMatchObject({
        status: "DUPLICATE_REVIEW",
        duplicateCandidates: [manual.id],
      });
      await resolveFinancialEvidence(userId, out.id, "duplicate", manual.id);
      await ingestFinancialEvidence(userId, {
        ...input("first-in", 50000n),
        externalAccountId: other.id,
        direction: "CREDIT",
        ownCounterpartyIdentity: "source",
      });
      await ingestFinancialEvidence(userId, {
        ...input("second-out", 50000n),
        ownCounterpartyIdentity: "target",
      });
      await ingestFinancialEvidence(userId, {
        ...input("second-in", 50000n),
        externalAccountId: other.id,
        direction: "CREDIT",
        ownCounterpartyIdentity: "source",
      });
      const events = await prisma.financialTransaction.findMany({
        where: { userId },
      });
      expect(events).toHaveLength(2);
      expect(events.every((event) => event.type === "TRANSFER")).toBe(true);
      expect(events.find((event) => event.id === manual.id)?.notes).toBe(
        "Existing reserve transfer",
      );
    });
    it("preserves statement history and interpretation when switching to live sync", async () => {
      const card = await prisma.financialAccount.create({
        data: {
          userId,
          name: "ING More",
          type: "CREDIT_CARD",
          repaymentMethod: "MANUAL",
          currency: "EUR",
          dataSource: "STATEMENT_IMPORT",
        },
      });
      const data = new TextEncoder().encode(
        `Date,Amount,Description\n${financeToday().toISODate()},-9.50,Cafe`,
      );
      const preview = await previewStatementImport(userId, card.id, {
        name: "ing.csv",
        data,
      });
      await confirmStatementImport(userId, preview.id);
      const event = await prisma.financialTransaction.findFirstOrThrow({
        where: { userId, accountId: card.id },
      });
      await interpretFinancialTransaction(userId, {
        id: event.id,
        notes: "Keep forever",
        tags: ["receipt"],
      });
      const live = await prisma.externalBankAccount.create({
        data: {
          userId,
          connectionId,
          provider: "TEST",
          identityKey: "card-live",
          providerAccountId: "card-live",
          externalType: "CARD",
          currency: "EUR",
        },
      });
      await mapExternalFinancialAccount(userId, live.id, card.id);
      const observed = await ingestFinancialEvidence(userId, {
        ...input("live-cafe", 950n),
        externalAccountId: live.id,
      });
      expect(observed.transactionId).toBeNull();
      await resolveFinancialEvidence(
        userId,
        observed.id,
        "duplicate",
        event.id,
      );
      expect(
        await prisma.financialTransaction.count({
          where: { userId, accountId: card.id },
        }),
      ).toBe(1);
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: event.id },
        }),
      ).toMatchObject({ notes: "Keep forever", tags: ["receipt"] });
      const provenance = await prisma.financialEvidenceObservation.findMany({
        where: { userId, link: { transactionId: event.id } },
      });
      expect(new Set(provenance.map((item) => item.source))).toEqual(
        new Set(["STATEMENT_IMPORT", "LIVE_SYNC"]),
      );
      expect(
        await prisma.financialAccount.findUniqueOrThrow({
          where: { id: card.id },
        }),
      ).toMatchObject({ name: "ING More", dataSource: "LIVE_SYNC" });
    });
    it("requires explicit decisions for identical unreferenced statement rows before import", async () => {
      const data = new TextEncoder().encode(
        `Date,Amount,Description\n${financeToday().toISODate()},-5.00,Cafe\n${financeToday().toISODate()},-5.00,Cafe`,
      );
      const previews = await Promise.all([
        previewStatementImport(userId, accountId, { name: "two.csv", data }),
        previewStatementImport(userId, accountId, { name: "two.csv", data }),
      ]);
      expect(previews[0].id).toBe(previews[1].id);
      await expect(
        confirmStatementImport(userId, previews[0].id),
      ).rejects.toThrow("overlaps");
      const observations = await prisma.financialEvidenceObservation.findMany({
        where: { userId, importId: previews[0].id },
      });
      expect(observations).toHaveLength(2);
      for (const observation of observations)
        await resolveFinancialEvidence(userId, observation.id, "distinct");
      await confirmStatementImport(userId, previews[0].id);
      await confirmStatementImport(userId, previews[0].id);
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(2);
    });
    it("uses activity dates for date-only grouping across midnight and DST boundaries", async () => {
      const today = financeToday().toISODate()!;
      const older = financeToday().minus({ days: 1 }).toISODate()!;
      await prisma.financialTransaction.create({
        data: {
          userId,
          accountId,
          currency: "EUR",
          amountMinor: 100n,
          type: "EXPENSE",
          dataSource: "LIVE_SYNC",
          reviewedAt: null,
          activityOn: older,
          occurredAt: new Date(),
        },
      });
      const summary = await getFinanceActivity(userId);
      expect(summary.today.total).toBe(0);
      expect(summary.previous.needsReview).toBe(1);
      for (const day of [today, "2026-03-29", "2026-10-25"]) {
        expect(
          DateTime.fromJSDate(evidenceDay(day))
            .setZone("Europe/Amsterdam")
            .toISODate(),
        ).toBe(day);
      }
    });
    it("serializes opposite staged transfer legs during independent materialization", async () => {
      const destination = await prisma.financialAccount.create({
        data: { userId, name: "Reserve", type: "SAVINGS", currency: "EUR" },
      });
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { financialAccountId: null, identityAliases: ["source"] },
      });
      const other = await prisma.externalBankAccount.create({
        data: {
          userId,
          connectionId,
          provider: "TEST",
          identityKey: "reserve",
          identityAliases: ["target"],
          providerAccountId: "reserve",
          currency: "EUR",
        },
      });
      await ingestFinancialEvidence(userId, {
        ...input("staged-out", 50000n),
        ownCounterpartyIdentity: "target",
      });
      await ingestFinancialEvidence(userId, {
        ...input("staged-in", 50000n),
        externalAccountId: other.id,
        direction: "CREDIT",
        ownCounterpartyIdentity: "source",
      });
      await prisma.externalBankAccount.update({
        where: { id: externalId },
        data: { financialAccountId: accountId },
      });
      await prisma.externalBankAccount.update({
        where: { id: other.id },
        data: { financialAccountId: destination.id },
      });
      await Promise.all([
        materializeMappedEvidence(userId, externalId),
        materializeMappedEvidence(userId, other.id),
      ]);
      expect(
        await prisma.financialTransaction.count({
          where: { userId, type: "TRANSFER" },
        }),
      ).toBe(1);
      expect(
        await prisma.financialEvidenceLink.count({
          where: { userId, status: "PROJECTED", transactionId: { not: null } },
        }),
      ).toBe(2);
    });
    it("rejects stale correction actions and draft statement relationship actions", async () => {
      const other = await prisma.financialAccount.create({
        data: { userId, name: "Other", type: "CHECKING", currency: "EUR" },
      });
      const first = await ingestFinancialEvidence(
        userId,
        input("changed", 10000n),
      );
      await ingestFinancialEvidence(userId, input("changed", 8742n));
      await expect(
        confirmEvidenceTransfer(userId, first.id, other.id),
      ).rejects.toThrow("current confirmed evidence");
      expect(
        await prisma.financialEvidenceLink.count({
          where: { userId, status: "PROJECTED" },
        }),
      ).toBe(1);
      const data = new TextEncoder().encode(
        `Date,Amount,Description\n${financeToday().toISODate()},-15.00,Transfer`,
      );
      const preview = await previewStatementImport(userId, accountId, {
        name: "draft.csv",
        data,
      });
      const observed =
        await prisma.financialEvidenceObservation.findFirstOrThrow({
          where: { userId, importId: preview.id },
        });
      await expect(
        confirmEvidenceTransfer(userId, observed.id, other.id),
      ).rejects.toThrow("current confirmed evidence");
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
    });
    it("remaps normalized CSV facts without rewriting the previous evidence", async () => {
      const data = new TextEncoder().encode(
        `Date,Amount,Merchant,Description\n${financeToday().toISODate()},-3.50,Merchant A,Description B`,
      );
      const file = { name: "mapped.csv", data };
      const first = await previewStatementImport(userId, accountId, file, {
        counterparty: "Merchant",
      });
      await previewStatementImport(userId, accountId, file, {
        counterparty: "Description",
      });
      const observations = await prisma.financialEvidenceObservation.findMany({
        where: { userId, importId: first.id },
        include: { link: true },
      });
      expect(observations).toHaveLength(2);
      expect(
        observations.find((item) => item.link?.status === "STAGED")
          ?.counterpartyName,
      ).toBe("Description B");
      expect(
        observations.find((item) => item.link?.status === "IGNORED")
          ?.counterpartyName,
      ).toBe("Merchant A");
    });
    it("keeps today4 and older3 distinct, recognition and review independent", async () => {
      const known = await prisma.counterparty.create({
        data: { userId, name: "Known", normalizedName: "known" },
      });
      for (let i = 0; i < 7; i++)
        await prisma.financialTransaction.create({
          data: {
            userId,
            accountId,
            currency: "EUR",
            amountMinor: 100n,
            type: "EXPENSE",
            dataSource: "LIVE_SYNC",
            reviewedAt: null,
            occurredAt: (i < 4
              ? financeToday()
              : financeToday().minus({ days: 1 })
            ).toJSDate(),
            counterpartyId: i < 3 ? known.id : null,
          },
        });
      const summary = await getFinanceActivity(userId);
      expect(summary.today).toMatchObject({
        total: 4,
        recognized: 3,
        needsReview: 4,
        unknownCounterparties: 1,
      });
      expect(summary.previous).toMatchObject({
        needsReview: 3,
        unknownCounterparties: 3,
      });
      const row = await prisma.financialTransaction.findFirstOrThrow({
        where: {
          userId,
          counterpartyId: null,
          occurredAt: { gte: financeToday().toJSDate() },
        },
      });
      await interpretFinancialTransaction(userId, {
        id: row.id,
        counterpartyId: known.id,
      });
      expect((await getFinanceActivity(userId)).today.needsReview).toBe(4);
      await reviewFinancialTransactions(userId, [row.id]);
      expect((await getFinanceActivity(userId)).today.needsReview).toBe(3);
    });
    it("extracts a real text PDF for preview and rejects malformed dated amounts", async () => {
      const day = financeToday().toISODate()!;
      const preview = await previewStatementImport(userId, accountId, {
        name: "text-statement.pdf",
        data: textPdf(`${day} Cafe 9.50 Debit`),
      });
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(0);
      await confirmStatementImport(userId, preview.id);
      expect(
        await prisma.financialTransaction.findFirstOrThrow({
          where: { userId },
        }),
      ).toMatchObject({
        amountMinor: 950n,
        type: "EXPENSE",
        dataSource: "STATEMENT_IMPORT",
      });
      const malformed = await previewStatementImport(userId, accountId, {
        name: "unsupported.pdf",
        data: textPdf(`${day} Cafe unreadable-amount`),
      });
      await expect(
        confirmStatementImport(userId, malformed.id),
      ).rejects.toThrow("parsing error");
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
    });
    it("statement preview writes no ledger, overlaps attach metadata and imports repeat safely", async () => {
      const day = financeToday().toISODate()!;
      const manual = await prisma.financialTransaction.create({
        data: {
          userId,
          accountId,
          currency: "EUR",
          amountMinor: 1295n,
          type: "EXPENSE",
          occurredAt: evidenceDay(day),
          notes: "Old note",
          tags: ["keep"],
        },
      });
      const data = new TextEncoder().encode(
        `Date,Amount,Description\n${day},-12.95,Cafe`,
      );
      const preview = await previewStatementImport(userId, accountId, {
        name: "card.csv",
        data,
      });
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      const evidence =
        await prisma.financialEvidenceObservation.findFirstOrThrow({
          where: { userId, importId: preview.id },
        });
      expect(
        (
          await prisma.financialEvidenceLink.findUniqueOrThrow({
            where: { observationId: evidence.id },
          })
        ).status,
      ).toBe("DUPLICATE_REVIEW");
      await expect(confirmStatementImport(userId, preview.id)).rejects.toThrow(
        "overlaps",
      );
      await resolveFinancialEvidence(
        userId,
        evidence.id,
        "duplicate",
        manual.id,
      );
      await confirmStatementImport(userId, preview.id);
      await previewStatementImport(userId, accountId, {
        name: "card.csv",
        data,
      });
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: manual.id },
        }),
      ).toMatchObject({ notes: "Old note", tags: ["keep"] });
    });
    it("requires automatic card settlement, records purchase expense and repayment transfer", async () => {
      const base = {
        name: "ING More",
        bankName: "ING",
        type: "CREDIT_CARD",
        currency: "EUR",
        includeInLiquidSavings: false,
        balance: "0",
        reconciledAt: "2026-09-01T00:00",
      };
      await expect(
        createFinancialAccount(userId, {
          ...base,
          repaymentMethod: "LINKED_ACCOUNT",
        }),
      ).rejects.toThrow("settlement");
      const card = await createFinancialAccount(userId, {
        ...base,
        repaymentMethod: "LINKED_ACCOUNT",
        settlementAccountId: accountId,
        dataSource: "STATEMENT_IMPORT",
      });
      await ingestFinancialEvidence(userId, {
        ...input("card-buy", 20000n),
        source: "STATEMENT_IMPORT",
        externalAccountId: undefined,
        accountId: card.id,
      });
      expect(
        (await getFinancialPosition(userId)).find(
          (account) => account.id === card.id,
        )?.institutionName,
      ).toBe("ING");
      const repayment = await ingestFinancialEvidence(
        userId,
        input("repayment", 20000n),
      );
      await confirmEvidenceTransfer(userId, repayment.id, card.id);
      const cardLeg = await ingestFinancialEvidence(userId, {
        ...input("card-repayment", 20000n),
        source: "STATEMENT_IMPORT",
        externalAccountId: undefined,
        accountId: card.id,
        direction: "CREDIT",
      });
      expect(
        (await getFinanceActivity(userId)).today
          .unknownUnresolvedCounterparties,
      ).toBe(1);
      await confirmEvidenceTransfer(userId, cardLeg.id, accountId);
      await confirmEvidenceTransfer(userId, cardLeg.id, accountId);
      const different = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Different payer",
          type: "CHECKING",
          currency: "EUR",
        },
      });
      await expect(
        confirmEvidenceTransfer(userId, cardLeg.id, different.id),
      ).rejects.toThrow("observed account relationship");
      const manual = await createFinancialAccount(userId, {
        ...base,
        name: "Manual card",
        repaymentMethod: "MANUAL",
      });
      expect(
        await prisma.financialAccount.findUniqueOrThrow({
          where: { id: manual.id },
        }),
      ).toMatchObject({ settlementAccountId: null });
      await expect(
        updateCreditCardConfiguration(userId, card.id, {
          repaymentMethod: "LINKED_ACCOUNT",
        }),
      ).rejects.toThrow("settlement");
      await updateCreditCardConfiguration(userId, card.id, {
        repaymentMethod: "LINKED_ACCOUNT",
        settlementAccountId: accountId,
        statementDue: "200",
        statementDueOn: "2026-10-31",
        creditLimit: "1000",
        bankName: "ING",
      });
      expect(
        await prisma.financialAccount.findUniqueOrThrow({
          where: { id: card.id },
        }),
      ).toMatchObject({
        statementDueMinor: 20000n,
        creditLimitMinor: 100000n,
        settlementAccountId: accountId,
      });
      await updateCreditCardConfiguration(userId, manual.id, {
        repaymentMethod: "MANUAL",
      });
      const totals = await prisma.financialTransaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amountMinor: true },
      });
      expect(totals.find((x) => x.type === "EXPENSE")?._sum.amountMinor).toBe(
        20000n,
      );
      expect(totals.find((x) => x.type === "TRANSFER")?._sum.amountMinor).toBe(
        20000n,
      );
    });
    it("preserves confirmed counterparty recognition when an incoming card movement is classified as a refund", async () => {
      const counterparty = await prisma.counterparty.create({
        data: { userId, name: "Merchant", normalizedName: "merchant" },
      });
      await prisma.counterpartyIdentity.create({
        data: {
          userId,
          counterpartyId: counterparty.id,
          identityKey: "merchant-refund",
        },
      });
      const card = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Travel",
          bankName: "ING",
          type: "CREDIT_CARD",
          currency: "EUR",
          dataSource: "LIVE_SYNC",
          repaymentMethod: "LINKED_ACCOUNT",
          settlementAccountId: accountId,
        },
      });
      const observation = await ingestFinancialEvidence(userId, {
        ...input("card-refund", 950n),
        externalAccountId: undefined,
        accountId: card.id,
        direction: "CREDIT",
        counterpartyIdentity: "merchant-refund",
      });
      expect(observation.transactionId).toBeNull();
      const refund = await classifyIncomingEvidence(
        userId,
        observation.id,
        "REFUND",
      );
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: refund.id },
        }),
      ).toMatchObject({
        counterpartyId: counterparty.id,
        inflowKind: "REFUND",
        reviewedAt: null,
        expectedIncomeId: null,
      });
      expect(
        (await getFinanceActivity(userId)).today.unknownCounterparties,
      ).toBe(0);
    });
    it("reopens an expected-income occurrence when its actual receipt is corrected to a refund", async () => {
      const counterparty = await prisma.counterparty.create({
        data: { userId, name: "Employer", normalizedName: "employer" },
      });
      await prisma.counterpartyIdentity.create({
        data: {
          userId,
          counterpartyId: counterparty.id,
          identityKey: "employer",
        },
      });
      const today = financeToday().toISODate()!;
      const expectation = await prisma.financeExpectedIncome.create({
        data: {
          userId,
          accountId,
          counterpartyId: counterparty.id,
          title: "Expected receipt",
          amountMinor: 950n,
          currency: "EUR",
          dueOn: today,
        },
      });
      const fact = await ingestFinancialEvidence(userId, {
        ...input("receipt", 950n),
        direction: "CREDIT",
        counterpartyIdentity: "employer",
      });
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: fact.transactionId! },
        }),
      ).toMatchObject({ expectedIncomeId: expectation.id });
      const purchase = await ingestFinancialEvidence(
        userId,
        input("purchase", 950n),
      );
      await interpretFinancialTransaction(userId, {
        id: fact.transactionId!,
        refundOfId: purchase.transactionId!,
      });
      await interpretFinancialTransaction(userId, {
        id: fact.transactionId!,
        notes: "Refund confirmed",
      });
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: fact.transactionId! },
        }),
      ).toMatchObject({
        inflowKind: "REFUND",
        expectedIncomeId: null,
        expectedIncomeDueOn: null,
        reviewedAt: null,
      });
      await expect(
        prisma.$transaction((tx) =>
          linkExpectedIncomeTransaction(
            tx,
            userId,
            expectation.id,
            fact.transactionId!,
            today,
          ),
        ),
      ).rejects.toThrow("unlinked incoming");
    });
    it("requires active business receipt allocations to be corrected before reclassifying income as a refund", async () => {
      const purchase = await ingestFinancialEvidence(
        userId,
        input("allocated-purchase", 950n),
      );
      const receipt = await ingestFinancialEvidence(userId, {
        ...input("allocated-income", 950n),
        direction: "CREDIT",
      });
      const allocation = await prisma.businessReceiptAllocation.create({
        data: {
          userId,
          transactionId: receipt.transactionId!,
          originalTransactionId: receipt.transactionId!,
          amountMinor: 950n,
          currencySnapshot: "EUR",
          occurredAtSnapshot: new Date(),
        },
      });
      await expect(
        interpretFinancialTransaction(userId, {
          id: receipt.transactionId!,
          refundOfId: purchase.transactionId!,
        }),
      ).rejects.toThrow("allocations");
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: receipt.transactionId! },
        }),
      ).toMatchObject({ inflowKind: "OTHER", refundOfId: null });
      await prisma.businessReceiptAllocation.update({
        where: { id: allocation.id },
        data: { withdrawnAt: new Date() },
      });
      await interpretFinancialTransaction(userId, {
        id: receipt.transactionId!,
        refundOfId: purchase.transactionId!,
      });
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: receipt.transactionId! },
        }),
      ).toMatchObject({
        inflowKind: "REFUND",
        refundOfId: purchase.transactionId!,
      });
    });
    it("rejects foreign identities and editing/deleting imported facts", async () => {
      await expect(
        ingestFinancialEvidence("foreign", input("bad")),
      ).rejects.toThrow();
      const result = await ingestFinancialEvidence(userId, input("protected"));
      await expect(
        saveFinancialTransaction(
          userId,
          {
            type: "EXPENSE",
            amount: "20",
            currency: "EUR",
            accountId,
            occurredAt: DateTime.fromJSDate(
              evidenceDay(financeToday().toISODate()!),
            )
              .setZone("Europe/Amsterdam")
              .toFormat("yyyy-MM-dd'T'HH:mm"),
          },
          result.transactionId!,
        ),
      ).rejects.toThrow("immutable");
      await expect(
        deleteFinancialTransaction(userId, result.transactionId!),
      ).rejects.toThrow("retain");
    });
  },
);

// Minimal real PDF fixture: Helvetica text and a valid cross-reference table, no bank data.
function textPdf(text: string) {
  const stream = `BT /F1 12 Tf 40 740 Td (${text.replace(/[\\()]/g, "\\$&")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(document);
  document += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(document));
}
