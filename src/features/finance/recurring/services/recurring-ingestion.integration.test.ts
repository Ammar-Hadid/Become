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
let catchUpRecurring: typeof import("./recurring-processing.service").catchUpRecurring;
let resolveRecurringOccurrence: typeof import("./recurring-processing.service").resolveRecurringOccurrence;
let ingestFinancialEvidence: typeof import("@/features/finance/evidence/services/financial-evidence.service").ingestFinancialEvidence;
let linkRecurringTransaction: typeof import("./recurring-matching.service").linkRecurringTransaction;
let getRecurringSuggestions: typeof import("@/features/finance/recurring/queries/recurring-suggestions.query").getRecurringSuggestions;
let getFinanceForecast: typeof import("@/features/finance/forecast/queries/finance-forecast.query").getFinanceForecast;
let financeReviewProvider: typeof import("@/features/finance/measurements/queries/finance-review.query").financeReviewProvider;
let confirmRecurringSuggestion: typeof import("./recurring-suggestion.service").confirmRecurringSuggestion;

describe.skipIf(process.env.RUN_FINANCE_INTEGRATION !== "1")(
  "imported recurring expectations (isolated PostgreSQL)",
  () => {
    let userId: string;
    let accountId: string;
    let counterpartyId: string;
    beforeAll(async () => {
      if (
        !process.env.DATABASE_URL ||
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL).hostname,
        )
      )
        throw new Error("These tests require isolated local PostgreSQL.");
      ({ prisma } = await import("@/lib/db/adapters/prisma.adapter"));
      ({ catchUpRecurring, resolveRecurringOccurrence } =
        await import("./recurring-processing.service"));
      ({ ingestFinancialEvidence } =
        await import("@/features/finance/evidence/services/financial-evidence.service"));
      ({ linkRecurringTransaction } =
        await import("./recurring-matching.service"));
      ({ getRecurringSuggestions } =
        await import("@/features/finance/recurring/queries/recurring-suggestions.query"));
      ({ confirmRecurringSuggestion } =
        await import("./recurring-suggestion.service"));
      ({ getFinanceForecast } =
        await import("@/features/finance/forecast/queries/finance-forecast.query"));
      ({ financeReviewProvider } =
        await import("@/features/finance/measurements/queries/finance-review.query"));
    });
    beforeEach(async () => {
      userId = (
        await prisma.user.create({
          data: {
            name: "Recurring import test",
            email: `recurring-${randomUUID()}@example.test`,
          },
        })
      ).id;
      accountId = (
        await prisma.financialAccount.create({
          data: {
            userId,
            name: "Daily",
            type: "CHECKING",
            currency: "EUR",
            dataSource: "LIVE_SYNC",
          },
        })
      ).id;
      counterpartyId = (
        await prisma.counterparty.create({
          data: { userId, name: "Streaming", normalizedName: "streaming" },
        })
      ).id;
      await prisma.counterpartyIdentity.create({
        data: {
          userId,
          counterpartyId,
          identityKey: "streaming-bank-identity",
        },
      });
    });
    afterEach(async () => {
      if (!userId) return;
      await prisma.financialEvidenceLink.deleteMany({ where: { userId } });
      await prisma.financialEvidenceObservation.deleteMany({
        where: { userId },
      });
      await prisma.financialBalanceObservation.deleteMany({
        where: { userId },
      });
      await prisma.financialTransaction.deleteMany({ where: { userId } });
      await prisma.recurringExpenseOccurrence.deleteMany({ where: { userId } });
      await prisma.recurringExpense.deleteMany({ where: { userId } });
      await prisma.financeExpectedIncome.deleteMany({ where: { userId } });
      await prisma.counterpartyIdentity.deleteMany({ where: { userId } });
      await prisma.counterparty.deleteMany({ where: { userId } });
      await prisma.financialAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    });
    afterAll(() => prisma.$disconnect());
    const definition = () =>
      prisma.recurringExpense.create({
        data: {
          userId,
          accountId,
          counterpartyId,
          name: "Streaming",
          amountMinor: 1200n,
          currency: "EUR",
          frequency: "MONTHLY",
          dayOfMonth: 1,
          startOn: new Date("2026-06-01T00:00Z"),
          processedThroughOn: new Date("2026-05-31T00:00Z"),
          postingBehavior: "AUTOMATIC",
        },
      });
    const evidence = (
      reference: string,
      activityDate = "2026-06-01",
      amountMinor = 1200n,
    ) =>
      ingestFinancialEvidence(userId, {
        source: "LIVE_SYNC",
        accountId,
        reference,
        status: "BOOKED",
        direction: "DEBIT",
        amountMinor,
        currency: "EUR",
        activityDate,
        counterpartyIdentity: "streaming-bank-identity",
        counterpartyName: "Streaming",
        raw: { reference },
      });
    it("creates expectations on a live account and attaches a repeated imported payment without creating another actual transaction", async () => {
      const schedule = await definition();
      await catchUpRecurring(
        userId,
        DateTime.fromISO("2026-06-01", { zone: "Europe/Amsterdam" }),
      );
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(0);
      const occurrence =
        await prisma.recurringExpenseOccurrence.findFirstOrThrow({
          where: { userId, recurringExpenseId: schedule.id },
        });
      expect(occurrence.status).toBe("AWAITING_CONFIRMATION");
      const first = await evidence("bank-1");
      await evidence("bank-1");
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.financialTransaction.findFirstOrThrow({
          where: { id: first.transactionId! },
        }),
      ).toMatchObject({
        amountMinor: 1200n,
        recurringExpenseOccurrenceId: occurrence.id,
        reviewedAt: null,
      });
      expect(
        await prisma.recurringExpenseOccurrence.findUniqueOrThrow({
          where: { id: occurrence.id },
        }),
      ).toMatchObject({ status: "POSTED_CONFIRMED" });
    });
    it("leaves changed amounts unresolved and lets explicit linking preserve one existing fact", async () => {
      await definition();
      await catchUpRecurring(
        userId,
        DateTime.fromISO("2026-06-01", { zone: "Europe/Amsterdam" }),
      );
      const occurrence =
        await prisma.recurringExpenseOccurrence.findFirstOrThrow({
          where: { userId },
        });
      await expect(
        resolveRecurringOccurrence(userId, occurrence.id, "confirm", {}),
      ).rejects.toThrow("Await the imported payment");
      const fact = await evidence("changed", "2026-06-01", 1300n);
      expect(
        await prisma.recurringExpenseOccurrence.findUniqueOrThrow({
          where: { id: occurrence.id },
        }),
      ).toMatchObject({ status: "AWAITING_CONFIRMATION" });
      await prisma.$transaction((tx) =>
        linkRecurringTransaction(
          tx,
          userId,
          occurrence.id,
          fact.transactionId!,
        ),
      );
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.financialTransaction.findFirstOrThrow({
          where: { id: fact.transactionId! },
        }),
      ).toMatchObject({
        amountMinor: 1300n,
        recurringExpenseOccurrenceId: occurrence.id,
      });
    });
    it("requires reviewed repeated facts and confirms a commitment without manufacturing history", async () => {
      const facts = await Promise.all([
        evidence("one", "2026-01-01"),
        evidence("two", "2026-02-01"),
        evidence("three", "2026-03-01"),
      ]);
      expect(await getRecurringSuggestions(userId)).toEqual([]);
      await prisma.financialTransaction.updateMany({
        where: { userId, id: { in: facts.map((fact) => fact.transactionId!) } },
        data: { reviewedAt: new Date() },
      });
      const suggestion = (await getRecurringSuggestions(userId))[0];
      expect(suggestion).toMatchObject({
        frequency: "MONTHLY",
        amountMinor: 1200n,
      });
      await confirmRecurringSuggestion(userId, suggestion.key);
      expect(await prisma.recurringExpense.count({ where: { userId } })).toBe(
        1,
      );
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(3);
      expect(await getRecurringSuggestions(userId)).toEqual([]);
    });
    it("matches an actual expected-income receipt and retains future monthly occurrences", async () => {
      const now = new Date();
      const today = DateTime.fromJSDate(now)
        .setZone("Europe/Amsterdam")
        .toISODate()!;
      const income = await prisma.financeExpectedIncome.create({
        data: {
          userId,
          accountId,
          counterpartyId,
          title: "Salary",
          amountMinor: 1200n,
          currency: "EUR",
          dueOn: today,
          anchorDate: today,
          recurrenceFrequency: "MONTHLY",
        },
      });
      await prisma.financialBalanceObservation.create({
        data: {
          userId,
          accountId,
          source: "LIVE_SYNC",
          balanceMinor: 100000n,
          currency: "EUR",
          balanceType: "CLBD",
          observedAt: now,
          payloadHash: randomUUID(),
          raw: {},
        },
      });
      const fact = await ingestFinancialEvidence(userId, {
        source: "LIVE_SYNC",
        accountId,
        reference: "salary",
        status: "BOOKED",
        direction: "CREDIT",
        amountMinor: 1200n,
        currency: "EUR",
        activityDate: today,
        counterpartyIdentity: "streaming-bank-identity",
        raw: {},
      });
      expect(
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: fact.transactionId! },
        }),
      ).toMatchObject({
        expectedIncomeId: income.id,
        expectedIncomeDueOn: today,
      });
      const forecast = await getFinanceForecast(userId, 90);
      const projections = forecast.currencies[0].movements.filter(
        (movement) => movement.kind === "EXPECTED_INCOME",
      );
      expect(projections.some((movement) => movement.on === today)).toBe(false);
      expect(projections.length).toBeGreaterThan(0);
      expect(projections.every((movement) => movement.on > today)).toBe(true);
      const sources = await prisma.$queryRaw<
        { excerpt: string; value: string }[]
      >(
        financeReviewProvider.sql({
          userId,
          start: DateTime.fromISO(today, { zone: "Europe/Amsterdam" })
            .toUTC()
            .toJSDate(),
          end: new Date(now.getTime() + 86400000),
          at: now,
        }),
      );
      expect(sources).toHaveLength(1);
      expect(sources[0].excerpt).toContain("LIVE_SYNC");
      expect(sources[0].excerpt).toContain("awaiting review");
    });
    it("serializes catch-up and overlapping retries into one actual payment", async () => {
      await definition();
      await Promise.all([
        catchUpRecurring(
          userId,
          DateTime.fromISO("2026-06-01", { zone: "Europe/Amsterdam" }),
        ),
        evidence("concurrent-payment"),
        evidence("concurrent-payment"),
      ]);
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.recurringExpenseOccurrence.count({ where: { userId } }),
      ).toBe(1);
      expect(
        await prisma.recurringExpenseOccurrence.findFirstOrThrow({
          where: { userId },
        }),
      ).toMatchObject({ status: "POSTED_CONFIRMED" });
    });
  },
);
