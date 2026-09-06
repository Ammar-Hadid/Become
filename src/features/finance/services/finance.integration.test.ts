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
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  createFinancialAccount,
  reconcileFinancialAccount,
  updateFinancialAccount,
} from "@/features/finance/accounts/services/financial-account.service";
import {
  getFinancialPosition,
  sumPosition,
} from "@/features/finance/accounts/queries/financial-position.query";
import {
  saveFinancialTransaction,
  deleteFinancialTransaction,
} from "@/features/finance/transactions/services/financial-transaction.service";
import { saveFinanceReserve } from "@/features/finance/settings/services/finance-policy.service";
import {
  saveSavingsGoal,
  rebalanceSavings,
  archiveSavingsGoal,
} from "@/features/finance/savings/services/savings-goal.service";
import {
  recordGoalPurchase,
  linkGoalExpense,
} from "@/features/finance/savings/services/goal-purchase.service";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import {
  saveRecurringDefinition,
  setRecurringStatus,
} from "@/features/finance/recurring/services/recurring-definition.service";
import {
  catchUpRecurring,
  resolveRecurringOccurrence,
} from "@/features/finance/recurring/services/recurring-processing.service";
import {
  financeToday,
  storedDay,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import { saveWorkSource } from "@/features/finance/work-sources/services/work-source.service";
import {
  saveIncomeOpportunity,
  continueAcceptedOpportunity,
} from "@/features/finance/opportunities/services/income-opportunity.service";
import { replacePaymentAllocations } from "@/features/finance/payments/services/payment-allocation.service";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { startSession } from "@/features/sessions/lifecycle/services/start-session.service";
import { getCashFlow } from "@/features/finance/analytics/queries/cash-flow.query";
import { getPeriod } from "@/lib/dates/utils/period.util";
import { getFinanceWork } from "@/features/finance/analytics/queries/finance-work.query";
import {
  archiveExpenseCategory,
  saveExpenseCategory,
} from "@/features/finance/categories/services/expense-category.service";
import {
  archiveCounterparty,
  saveCounterparty,
} from "@/features/finance/counterparties/services/counterparty.service";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";

describe.skipIf(process.env.RUN_FINANCE_INTEGRATION !== "1")(
  "Finance integrity (real PostgreSQL)",
  () => {
    let userId: string;
    let otherUserId: string;
    beforeAll(() => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error("Finance integration tests require local PostgreSQL.");
    });
    beforeEach(async () => {
      userId = (
        await prisma.user.create({
          data: {
            name: "Finance test",
            email: `finance-${randomUUID()}@example.test`,
          },
        })
      ).id;
      otherUserId = (
        await prisma.user.create({
          data: {
            name: "Other test",
            email: `finance-${randomUUID()}@example.test`,
          },
        })
      ).id;
    });
    afterEach(async () => {
      const where = { userId: { in: [userId, otherUserId] } };
      await prisma.paymentSessionAllocation.deleteMany({ where });
      await prisma.savingsGoalExpenseAllocation.deleteMany({ where });
      await prisma.financialTransaction.deleteMany({ where });
      await prisma.recurringExpenseOccurrence.deleteMany({ where });
      await prisma.recurringExpense.deleteMany({ where });
      await prisma.session.deleteMany({ where });
      await prisma.incomeOpportunity.deleteMany({ where });
      await prisma.workSource.deleteMany({ where });
      await prisma.savingsGoal.deleteMany({ where });
      await prisma.financialAccountBalanceSnapshot.deleteMany({ where });
      await prisma.financialAccount.deleteMany({ where });
      await prisma.expenseCategory.deleteMany({ where });
      await prisma.counterparty.deleteMany({ where });
      await prisma.financeCurrencyPolicy.deleteMany({ where });
      await prisma.user.deleteMany({
        where: { id: { in: [userId, otherUserId] } },
      });
    });
    afterAll(() => prisma.$disconnect());
    const account = (balance = "1000", currency = "EUR", owner?: string) =>
      createFinancialAccount(owner ?? userId, {
        name: `Account ${randomUUID()}`,
        type: "SAVINGS",
        currency,
        includeInLiquidSavings: true,
        balance,
        reconciledAt: "2026-01-01T00:00",
      });
    const transaction = (
      accountId: string,
      amount = "100",
      type = "EXPENSE",
      extra = {},
    ) => ({
      accountId,
      amount,
      currency: "EUR",
      type,
      occurredAt: "2026-02-01T12:00",
      ...(type === "INCOME" ? { inflowKind: "EARNED_WORK" } : {}),
      ...extra,
    });
    const goal = (name = "Goal", currency = "EUR") =>
      saveSavingsGoal(userId, {
        name,
        currency,
        target: "2000",
        status: "ACTIVE",
      });
    const recurring = (accountId: string, extra = {}) => ({
      name: "Monthly bill",
      amount: "10",
      currency: "EUR",
      accountId,
      frequency: "MONTHLY",
      dayOfWeek: null,
      dayOfMonth: 31,
      monthOfYear: null,
      startOn: "2026-01-01",
      endOn: "",
      postingBehavior: "AUTOMATIC",
      ...extra,
    });
    const paidSession = async () => {
      await ensureDefaultDomains(userId);
      const activity = await prisma.activityType.findFirstOrThrow({
        where: { domain: { userId }, financeActivityKind: "PAID_WORK" },
      });
      return prisma.session.create({
        data: {
          userId,
          domainId: activity.domainId,
          activityTypeId: activity.id,
          financeActivityKind: "PAID_WORK",
          financeCompensationType: "HOURLY",
          startedAt: new Date("2026-02-01T10:00Z"),
          endedAt: new Date("2026-02-01T11:00Z"),
        },
      });
    };
    it("derives balances from anchors, strictly subsequent flows, negative balances and historical archive dates", async () => {
      const a = await account();
      await saveFinancialTransaction(userId, transaction(a.id, "1100"));
      expect((await getFinancialPosition(userId))[0].balanceMinor).toBe(
        -10000n,
      );
      expect(
        (await getFinancialPosition(userId, new Date("2026-01-15Z")))[0]
          .balanceMinor,
      ).toBe(100000n);
      await reconcileFinancialAccount(userId, {
        accountId: a.id,
        balance: "20",
        reconciledAt: "2026-03-01T00:00",
      });
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "5", "INCOME", { occurredAt: "2026-03-02T00:00" }),
      );
      expect((await getFinancialPosition(userId))[0].balanceMinor).toBe(2500n);
      await updateFinancialAccount(userId, a.id, { archivedAt: new Date() });
      expect(await getFinancialPosition(userId)).toHaveLength(0);
      expect(
        (await getFinancialPosition(userId, new Date("2026-04-01Z")))[0]
          .balanceMinor,
      ).toBe(2500n);
    });
    it("keeps missing reconciliation unknown, including a mixed complete/incomplete savings aggregate", async () => {
      await account();
      await prisma.financialAccount.create({
        data: {
          userId,
          name: "Unreconciled",
          currency: "EUR",
          type: "CASH",
          includeInLiquidSavings: true,
        },
      });
      expect(
        sumPosition(await getFinancialPosition(userId)).get("EUR"),
      ).toBeNull();
      expect((await getSavings(userId)).pools[0].aboveReserve).toBeNull();
    });
    it("keeps income and expense counterparties valid, reusable, and optional", async () => {
      const a = await account();
      const created = await saveFinancialTransaction(
        userId,
        transaction(a.id, "10", "EXPENSE", { counterpartyName: "Dirk" }),
      );
      const first = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: created.id },
        include: { counterparty: true },
      });
      expect(first.counterparty).toMatchObject({
        name: "Dirk",
        normalizedName: "dirk",
      });

      await saveFinancialTransaction(
        userId,
        transaction(a.id, "20", "EXPENSE", {
          counterpartyId: first.counterpartyId,
        }),
      );
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "30", "EXPENSE", { counterpartyName: "DIRK" }),
      );
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "50", "INCOME", {
          counterpartyId: first.counterpartyId,
        }),
      );
      const withoutCounterparty = await saveFinancialTransaction(
        userId,
        transaction(a.id, "40"),
      );

      expect(await prisma.counterparty.count({ where: { userId } })).toBe(1);
      expect(
        await prisma.financialTransaction.count({
          where: { userId, counterpartyId: first.counterpartyId },
        }),
      ).toBe(4);
      expect(
        (
          await prisma.financialTransaction.findUniqueOrThrow({
            where: { id: withoutCounterparty.id },
          })
        ).counterpartyId,
      ).toBeNull();
      const groups = await prisma.financialTransaction.groupBy({
        by: ["counterpartyId"],
        where: { userId },
        _sum: { amountMinor: true },
      });
      expect(groups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            counterpartyId: first.counterpartyId,
            _sum: { amountMinor: 11000n },
          }),
        ]),
      );
      await expect(
        prisma.counterparty.create({
          data: {
            userId,
            name: "dirk",
            normalizedName: "dirk",
          },
        }),
      ).rejects.toThrow();
    });
    it("preserves category and counterparty references through rename and archive", async () => {
      const a = await account();
      const category = await saveExpenseCategory(userId, {
        name: "Groceries",
      });
      const counterparty = await saveCounterparty(userId, { name: "AH" });
      const created = await saveFinancialTransaction(
        userId,
        transaction(a.id, "10", "EXPENSE", {
          expenseCategoryId: category.id,
          counterpartyId: counterparty.id,
        }),
      );

      await saveExpenseCategory(userId, {
        id: category.id,
        name: "Food",
      });
      await saveCounterparty(userId, {
        id: counterparty.id,
        name: "Albert Heijn",
      });
      await archiveExpenseCategory(userId, category.id);
      await archiveCounterparty(userId, counterparty.id);

      expect(await getCounterpartyOptions(userId)).toEqual([]);
      expect(
        await prisma.expenseCategory.findMany({
          where: { userId, archivedAt: null },
        }),
      ).toEqual([]);

      await saveFinancialTransaction(
        userId,
        transaction(a.id, "11", "EXPENSE", {
          expenseCategoryId: category.id,
          counterpartyId: counterparty.id,
        }),
        created.id,
      );
      const historical = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: created.id },
        include: { expenseCategory: true, counterparty: true },
      });
      expect(historical.expenseCategory).toMatchObject({
        id: category.id,
        name: "Food",
      });
      expect(historical.counterparty).toMatchObject({
        id: counterparty.id,
        name: "Albert Heijn",
      });
    });
    it("isolates counterparty identity by user at service and database boundaries", async () => {
      const ownAccount = await account();
      const otherAccount = await account("1000", "EUR", otherUserId);
      const otherTransaction = await saveFinancialTransaction(
        otherUserId,
        transaction(otherAccount.id, "10", "EXPENSE", {
          counterpartyName: "Dirk",
        }),
      );
      const other = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: otherTransaction.id },
      });

      await expect(
        saveFinancialTransaction(
          userId,
          transaction(ownAccount.id, "10", "EXPENSE", {
            counterpartyId: other.counterpartyId,
          }),
        ),
      ).rejects.toThrow("unavailable");
      await expect(
        prisma.financialTransaction.create({
          data: {
            userId,
            accountId: ownAccount.id,
            counterpartyId: other.counterpartyId,
            type: "EXPENSE",
            currency: "EUR",
            amountMinor: 1000n,
            occurredAt: new Date(),
          },
        }),
      ).rejects.toThrow();

      await saveFinancialTransaction(
        userId,
        transaction(ownAccount.id, "10", "EXPENSE", {
          counterpartyName: "dirk",
        }),
      );
      expect(
        await prisma.counterparty.count({
          where: { userId: { in: [userId, otherUserId] } },
        }),
      ).toBe(2);
    });
    it("rejects cross-owner snapshots, transfer destinations and deleting referenced accounts at the database", async () => {
      const a = await account();
      const b = await account("100", "EUR", otherUserId);
      await expect(
        prisma.financialAccountBalanceSnapshot.create({
          data: {
            userId,
            accountId: b.id,
            balanceMinor: 0n,
            reconciledAt: new Date(),
          },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.financialTransaction.create({
          data: {
            userId,
            accountId: a.id,
            destinationAccountId: b.id,
            type: "TRANSFER",
            currency: "EUR",
            amountMinor: 10n,
            occurredAt: new Date(),
          },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.financialAccount.delete({ where: { id: a.id } }),
      ).rejects.toThrow();
    });
    it("moves transfers once and excludes them from cash income/expense", async () => {
      const a = await account();
      const b = await account("0");
      const usd = await account("0", "USD");
      const counterparty = await prisma.counterparty.create({
        data: {
          userId,
          name: "External bank",
          normalizedName: "external bank",
        },
      });
      await expect(
        prisma.financialTransaction.create({
          data: {
            userId,
            accountId: a.id,
            destinationAccountId: usd.id,
            type: "TRANSFER",
            currency: "EUR",
            amountMinor: 100n,
            occurredAt: new Date(),
          },
        }),
      ).rejects.toThrow();
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(a.id, "1", "TRANSFER", {
            destinationAccountId: b.id,
            counterpartyId: counterparty.id,
          }),
        ),
      ).rejects.toThrow("A transfer cannot have a counterparty.");
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(a.id, "1", "TRANSFER", {
            destinationAccountId: b.id,
            counterpartyName: "Should not be created",
          }),
        ),
      ).rejects.toThrow("A transfer cannot have a counterparty.");
      expect(await prisma.counterparty.count({ where: { userId } })).toBe(1);
      const transfer = await saveFinancialTransaction(
        userId,
        transaction(a.id, "200", "TRANSFER", { destinationAccountId: b.id }),
      );
      expect(
        (
          await prisma.financialTransaction.findUniqueOrThrow({
            where: { id: transfer.id },
          })
        ).counterpartyId,
      ).toBeNull();
      const position = await getFinancialPosition(userId);
      expect(position.find((p) => p.id === a.id)?.balanceMinor).toBe(80000n);
      expect(position.find((p) => p.id === b.id)?.balanceMinor).toBe(20000n);
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(a.id, "1", "TRANSFER", { destinationAccountId: a.id }),
        ),
      ).rejects.toThrow();
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(a.id, "1", "TRANSFER", { destinationAccountId: usd.id }),
        ),
      ).rejects.toThrow();
      const flow = await getCashFlow(
        userId,
        getPeriod(
          DateTime.fromISO("2026-02-10", { zone: "Europe/Amsterdam" }),
          "month",
        ),
      );
      expect(flow.totals.get("EUR")).toMatchObject({
        income: 0n,
        expense: 0n,
        transfer: 20000n,
      });
      expect(
        flow.totals.get("EUR")!.income - flow.totals.get("EUR")!.expense,
      ).toBe(0n);
    });
    it("requires a known sufficient source balance only for transfers", async () => {
      const belowSource = await account("36.22");
      const belowDestination = await account("9.36");
      await saveFinancialTransaction(
        userId,
        transaction(belowSource.id, "10", "TRANSFER", {
          destinationAccountId: belowDestination.id,
        }),
      );
      let position = await getFinancialPosition(userId);
      expect(
        position.find(({ id }) => id === belowSource.id)?.balanceMinor,
      ).toBe(2622n);
      expect(
        position.find(({ id }) => id === belowDestination.id)?.balanceMinor,
      ).toBe(1936n);
      expect(
        [belowSource.id, belowDestination.id].reduce(
          (total, id) =>
            total +
            position.find((account) => account.id === id)!.balanceMinor!,
          0n,
        ),
      ).toBe(4558n);

      const equalSource = await account("36.22");
      const equalDestination = await account("0");
      const equalTransfer = await saveFinancialTransaction(
        userId,
        transaction(equalSource.id, "36.22", "TRANSFER", {
          destinationAccountId: equalDestination.id,
        }),
      );
      position = await getFinancialPosition(userId);
      expect(
        position.find(({ id }) => id === equalSource.id)?.balanceMinor,
      ).toBe(0n);
      expect(
        position.find(({ id }) => id === equalDestination.id)?.balanceMinor,
      ).toBe(3622n);
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(equalSource.id, "36.22", "TRANSFER", {
            destinationAccountId: equalDestination.id,
          }),
          equalTransfer.id,
        ),
      ).resolves.toMatchObject({ id: equalTransfer.id });

      const rejectedSource = await account("36.22");
      const rejectedDestination = await account("9.36");
      for (const amount of ["36.23", "10000"]) {
        await expect(
          saveFinancialTransaction(
            userId,
            transaction(rejectedSource.id, amount, "TRANSFER", {
              destinationAccountId: rejectedDestination.id,
            }),
          ),
        ).rejects.toThrow(
          "Transfer amount exceeds the source account's available recorded balance.",
        );
      }
      expect(
        await prisma.financialTransaction.count({
          where: {
            userId,
            accountId: rejectedSource.id,
            destinationAccountId: rejectedDestination.id,
          },
        }),
      ).toBe(0);
      position = await getFinancialPosition(userId);
      expect(
        position.find(({ id }) => id === rejectedDestination.id)?.balanceMinor,
      ).toBe(936n);

      const unknownSource = await prisma.financialAccount.create({
        data: {
          userId,
          name: `Unreconciled ${randomUUID()}`,
          currency: "EUR",
          type: "CHECKING",
        },
      });
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(unknownSource.id, "1", "TRANSFER", {
            destinationAccountId: rejectedDestination.id,
          }),
        ),
      ).rejects.toThrow("Reconcile the source account before transferring");

      const expenseAccount = await account("36.22");
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(expenseAccount.id, "100", "EXPENSE"),
        ),
      ).resolves.toHaveProperty("id");
      expect(
        (await getFinancialPosition(userId)).find(
          ({ id }) => id === expenseAccount.id,
        )?.balanceMinor,
      ).toBe(-6378n);

      const incomeAccount = await account("0");
      await expect(
        saveFinancialTransaction(
          userId,
          transaction(incomeAccount.id, "12.34", "INCOME"),
        ),
      ).resolves.toHaveProperty("id");
      expect(
        (await getFinancialPosition(userId)).find(
          ({ id }) => id === incomeAccount.id,
        )?.balanceMinor,
      ).toBe(1234n);
    });
    it("serializes competing transfers against the source balance", async () => {
      const source = await account("100");
      const destination = await account("0");
      const results = await Promise.allSettled([
        saveFinancialTransaction(
          userId,
          transaction(source.id, "60", "TRANSFER", {
            destinationAccountId: destination.id,
          }),
        ),
        saveFinancialTransaction(
          userId,
          transaction(source.id, "60", "TRANSFER", {
            destinationAccountId: destination.id,
          }),
        ),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      const position = await getFinancialPosition(userId);
      expect(position.find(({ id }) => id === source.id)?.balanceMinor).toBe(
        4000n,
      );
      expect(
        position.find(({ id }) => id === destination.id)?.balanceMinor,
      ).toBe(6000n);
      expect(
        await prisma.financialTransaction.count({
          where: {
            userId,
            accountId: source.id,
            destinationAccountId: destination.id,
          },
        }),
      ).toBe(1);
    });
    it("serializes competing savings increases and never silently reduces allocations after an expense/reserve change", async () => {
      const a = await account("1000");
      await saveFinanceReserve(userId, "EUR", "500");
      const first = await goal("First");
      const second = await goal("Second");
      const results = await Promise.allSettled([
        rebalanceSavings(userId, "EUR", [{ id: first.id, amount: "500" }]),
        rebalanceSavings(userId, "EUR", [{ id: second.id, amount: "500" }]),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect((await getSavings(userId)).pools[0].allocated).toBe(50000n);
      await saveFinancialTransaction(userId, transaction(a.id, "200"));
      expect((await getSavings(userId)).pools[0]).toMatchObject({
        allocated: 50000n,
        underfunding: 20000n,
      });
      await saveFinanceReserve(userId, "EUR", "700");
      expect((await getSavings(userId)).pools[0].underfunding).toBe(40000n);
      await rebalanceSavings(userId, "EUR", [
        { id: first.id, amount: "0" },
        { id: second.id, amount: "0" },
      ]);
      expect((await getSavings(userId)).pools[0].underfunding).toBe(0n);
    });
    it("allows reductions with unknown position; disallows increases", async () => {
      const a = await account();
      const g = await goal();
      await rebalanceSavings(userId, "EUR", [{ id: g.id, amount: "500" }]);
      await prisma.financialAccountBalanceSnapshot.deleteMany({
        where: { accountId: a.id },
      });
      await rebalanceSavings(userId, "EUR", [{ id: g.id, amount: "200" }]);
      await expect(
        rebalanceSavings(userId, "EUR", [{ id: g.id, amount: "300" }]),
      ).rejects.toThrow("Reconcile");
    });
    it("records a partial goal purchase atomically with independent release and immutable target", async () => {
      const a = await account("5000");
      const g = await goal();
      await rebalanceSavings(userId, "EUR", [{ id: g.id, amount: "1000" }]);
      const purchase = await recordGoalPurchase(
        userId,
        g.id,
        transaction(a.id, "700"),
        "500",
        "300",
        false,
      );
      const savings = await getSavings(userId);
      expect(savings.goals[0].funding).toMatchObject({
        target: 200000n,
        spent: 50000n,
        remaining: 150000n,
        allocated: 70000n,
      });
      await expect(
        recordGoalPurchase(
          userId,
          g.id,
          transaction(a.id, "100"),
          "200",
          "0",
          false,
        ),
      ).rejects.toThrow();
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      await deleteFinancialTransaction(userId, purchase.id);
      expect((await getSavings(userId)).goals[0].funding).toMatchObject({
        spent: 0n,
        allocated: 70000n,
      });
    });
    it("prevents double-counting expense across goals and validates linked corrections", async () => {
      const a = await account();
      const first = await goal("First");
      const second = await goal("Second");
      const usd = await goal("USD goal", "USD");
      const expense = await saveFinancialTransaction(
        userId,
        transaction(a.id, "100"),
      );
      const results = await Promise.allSettled([
        linkGoalExpense(userId, expense.id, first.id, "75"),
        linkGoalExpense(userId, expense.id, second.id, "75"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      await expect(
        linkGoalExpense(userId, expense.id, usd.id, "1"),
      ).rejects.toThrow();
      await expect(
        saveFinancialTransaction(userId, transaction(a.id, "50"), expense.id),
      ).rejects.toThrow();
    });
    it("requires explicit archive release and target correction below spending", async () => {
      const a = await account();
      const g = await goal();
      await rebalanceSavings(userId, "EUR", [{ id: g.id, amount: "100" }]);
      const expense = await saveFinancialTransaction(
        userId,
        transaction(a.id, "500"),
      );
      await linkGoalExpense(userId, expense.id, g.id, "500");
      await expect(
        saveSavingsGoal(
          userId,
          { name: "Goal", currency: "EUR", target: "200", status: "ACTIVE" },
          g.id,
        ),
      ).rejects.toThrow("Explicitly confirm");
      await saveSavingsGoal(
        userId,
        {
          name: "Goal",
          currency: "EUR",
          target: "200",
          status: "COMPLETED",
          confirmBelowSpent: true,
        },
        g.id,
      );
      expect((await getSavings(userId)).goals[0].funding.overAllocated).toBe(
        10000n,
      );
      await expect(archiveSavingsGoal(userId, g.id, false)).rejects.toThrow();
      await archiveSavingsGoal(userId, g.id, true);
      expect((await getSavings(userId)).goals[0]).toMatchObject({
        allocatedAmountMinor: 0n,
        status: "COMPLETED",
      });
      await linkGoalExpense(userId, expense.id, g.id, "400");
      const corrected = await prisma.savingsGoal.findUniqueOrThrow({
        where: { id: g.id },
      });
      expect(corrected.status).toBe("COMPLETED");
      expect(corrected.completionNeedsReviewAt).not.toBeNull();
      await linkGoalExpense(userId, expense.id, g.id, "0");
      expect(
        await prisma.savingsGoalExpenseAllocation.count({
          where: { savingsGoalId: g.id },
        }),
      ).toBe(0);
    });
    it("converges concurrent/repeated recurring catch-up and preserves scheduled history through corrections", async () => {
      const a = await account();
      const category = await saveExpenseCategory(userId, {
        name: "Subscriptions",
      });
      const counterparty = await saveCounterparty(userId, {
        name: "Service provider",
      });
      const definition = await saveRecurringDefinition(
        userId,
        recurring(a.id, {
          expenseCategoryId: category.id,
          counterpartyId: counterparty.id,
        }),
      );
      const through = DateTime.fromISO("2026-03-31", {
        zone: "Europe/Amsterdam",
      });
      await Promise.all([
        catchUpRecurring(userId, through),
        catchUpRecurring(userId, through),
      ]);
      await catchUpRecurring(userId, through);
      const occurrences = await prisma.recurringExpenseOccurrence.findMany({
        where: { userId },
        include: {
          counterparty: true,
          transaction: { include: { counterparty: true } },
        },
        orderBy: { dueOn: "asc" },
      });
      expect(
        occurrences.map((o) => o.dueOn.toISOString().slice(0, 10)),
      ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(3);
      expect(
        occurrences.every(
          (occurrence) =>
            occurrence.counterpartyId === counterparty.id &&
            occurrence.transaction?.counterpartyId === counterparty.id,
        ),
      ).toBe(true);
      await saveCounterparty(userId, {
        id: counterparty.id,
        name: "Renamed provider",
      });
      expect(
        (
          await prisma.financialTransaction.findUniqueOrThrow({
            where: { id: occurrences[0].transaction!.id },
            include: { counterparty: true },
          })
        ).counterparty?.name,
      ).toBe("Renamed provider");
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "12", "EXPENSE", { occurredAt: "2026-02-01T00:00" }),
        occurrences[0].transaction!.id,
      );
      expect(
        (
          await prisma.recurringExpenseOccurrence.findUniqueOrThrow({
            where: { id: occurrences[0].id },
          })
        ).scheduledAmountMinor,
      ).toBe(1000n);
      await deleteFinancialTransaction(userId, occurrences[0].transaction!.id);
      await catchUpRecurring(userId, through);
      expect(
        (
          await prisma.recurringExpenseOccurrence.findUniqueOrThrow({
            where: { id: occurrences[0].id },
          })
        ).status,
      ).toBe("AWAITING_CONFIRMATION");
      expect(
        await prisma.financialTransaction.count({
          where: { recurringExpenseOccurrenceId: occurrences[0].id },
        }),
      ).toBe(0);
      await resolveRecurringOccurrence(userId, occurrences[0].id, "skip");
      await expect(
        updateFinancialAccount(userId, a.id, { archivedAt: new Date() }),
      ).rejects.toThrow("recurring");
      await setRecurringStatus(userId, definition.id, "pause");
      await updateFinancialAccount(userId, a.id, { archivedAt: new Date() });
      await expect(
        setRecurringStatus(userId, definition.id, "resume"),
      ).rejects.toThrow("active account");
    });
    it("confirms adjusted recurring facts once and prevents duplicate occurrence/posting at DB level", async () => {
      const a = await account();
      const definition = await saveRecurringDefinition(
        userId,
        recurring(a.id, {
          postingBehavior: "ASK_TO_CONFIRM",
          startOn: "2026-02-01",
          endOn: "2026-02-28",
        }),
      );
      await catchUpRecurring(
        userId,
        DateTime.fromISO("2026-03-01", { zone: "Europe/Amsterdam" }),
      );
      const occurrence =
        await prisma.recurringExpenseOccurrence.findFirstOrThrow({
          where: { userId },
        });
      await Promise.all([
        resolveRecurringOccurrence(
          userId,
          occurrence.id,
          "confirm",
          transaction(a.id, "12"),
        ),
        resolveRecurringOccurrence(
          userId,
          occurrence.id,
          "confirm",
          transaction(a.id, "12"),
        ),
      ]);
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(1);
      const { id: occurrenceId, ...copy } = occurrence;
      expect(occurrenceId).toBeTruthy();
      await expect(
        prisma.recurringExpenseOccurrence.create({ data: copy }),
      ).rejects.toThrow();
      await expect(
        prisma.financialTransaction.create({
          data: {
            userId,
            type: "EXPENSE",
            currency: "EUR",
            accountId: a.id,
            amountMinor: 1n,
            occurredAt: new Date(),
            recurringExpenseOccurrenceId: occurrence.id,
          },
        }),
      ).rejects.toThrow();
      await setRecurringStatus(userId, definition.id, "archive");
      expect(
        await prisma.recurringExpenseOccurrence.count({ where: { userId } }),
      ).toBe(1);
    });
    it.each(["today", "next"])(
      "makes same-day edit choice deterministic: %s",
      async (effect) => {
        const a = await account();
        const today = financeToday();
        const input = recurring(a.id, {
          frequency: "WEEKLY",
          dayOfWeek: today.weekday,
          dayOfMonth: null,
          startOn: today.toISODate()!,
        });
        const definition = await saveRecurringDefinition(userId, input);
        await expect(
          saveRecurringDefinition(
            userId,
            { ...input, amount: "20" },
            definition.id,
          ),
        ).rejects.toThrow("due today");
        await saveRecurringDefinition(
          userId,
          { ...input, amount: "20" },
          definition.id,
          effect,
        );
        await catchUpRecurring(userId);
        const occurrence =
          await prisma.recurringExpenseOccurrence.findFirstOrThrow({
            where: { userId },
          });
        expect(occurrence.scheduledAmountMinor).toBe(
          effect === "today" ? 2000n : 1000n,
        );
        await saveRecurringDefinition(
          userId,
          { ...input, amount: "30" },
          definition.id,
          "today",
        );
        expect(
          (
            await prisma.recurringExpenseOccurrence.findUniqueOrThrow({
              where: { id: occurrence.id },
            })
          ).scheduledAmountMinor,
        ).toBe(effect === "today" ? 2000n : 1000n);
      },
    );
    it("does not backfill paused dates when resuming", async () => {
      const a = await account();
      const today = financeToday();
      const definition = await saveRecurringDefinition(
        userId,
        recurring(a.id, {
          frequency: "WEEKLY",
          dayOfWeek: today.weekday,
          dayOfMonth: null,
          startOn: today.minus({ days: 21 }).toISODate()!,
        }),
      );
      await prisma.recurringExpense.update({
        where: { id: definition.id },
        data: {
          status: "PAUSED",
          pausedOn: storedDay(today.minus({ days: 21 })),
        },
      });
      await setRecurringStatus(userId, definition.id, "resume");
      await catchUpRecurring(userId);
      expect(
        await prisma.recurringExpenseOccurrence.count({ where: { userId } }),
      ).toBe(1);
    });
    it("saves accepted opportunities without creating a source, then explicitly creates or links atomically", async () => {
      const input = {
        title: "Lead",
        status: "ACCEPTED",
        discoveredAt: "2026-01-01T12:00",
      };
      const first = await saveIncomeOpportunity(userId, input);
      expect(first.resultingWorkSourceId).toBeNull();
      expect(await prisma.workSource.count({ where: { userId } })).toBe(0);
      const source = await continueAcceptedOpportunity(
        userId,
        first.id,
        "create",
        { name: "Client", type: "CLIENT", defaultCompensationType: "FIXED" },
      );
      const second = await saveIncomeOpportunity(userId, input);
      await continueAcceptedOpportunity(userId, second.id, "link", source.id);
      expect(await prisma.workSource.count({ where: { userId } })).toBe(1);
      const third = await saveIncomeOpportunity(userId, {
        ...input,
        expectedAmount: "1000",
        expectedCurrency: "EUR",
      });
      const foreign = await saveWorkSource(otherUserId, {
        name: "Foreign",
        type: "CLIENT",
      });
      await expect(
        continueAcceptedOpportunity(userId, third.id, "link", foreign.id),
      ).rejects.toThrow();
      expect(
        await prisma.financialTransaction.count({ where: { userId } }),
      ).toBe(0);
    });
    it("snapshots Finance timer classification and compensation without guessing custom activities", async () => {
      await ensureDefaultDomains(userId);
      const activity = await prisma.activityType.findFirstOrThrow({
        where: { domain: { userId }, financeActivityKind: "PAID_WORK" },
      });
      const source = await saveWorkSource(userId, {
        name: "Employer",
        type: "EMPLOYER",
        defaultCompensationType: "HOURLY",
      });
      const result = await startSession(userId, {
        domainId: activity.domainId,
        activityTypeId: activity.id,
        workSourceId: source.id,
        financeCompensationType: "FIXED",
        description: null,
      });
      expect(result.status).toBe("created");
      await prisma.workSource.update({
        where: { id: source.id },
        data: { defaultCompensationType: "TASK_BASED" },
      });
      expect(
        await prisma.session.findFirst({ where: { userId } }),
      ).toMatchObject({
        financeActivityKind: "PAID_WORK",
        financeCompensationType: "FIXED",
        paymentAttributionCompleteAt: null,
      });
      const custom = await prisma.activityType.create({
        data: {
          domainId: activity.domainId,
          name: "My custom activity",
          slug: "custom",
        },
      });
      expect(custom.financeActivityKind).toBeNull();
    });
    it("aggregates channel revenue only through explicit opportunity links and excludes expected money", async () => {
      const a = await account();
      const input = {
        title: "Referral",
        channel: "REFERRAL",
        status: "ACCEPTED",
        discoveredAt: "2026-02-01T12:00",
        expectedAmount: "9000",
        expectedCurrency: "EUR",
      };
      const first = await saveIncomeOpportunity(userId, input);
      const second = await saveIncomeOpportunity(userId, input);
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "100", "INCOME", { incomeOpportunityId: first.id }),
      );
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "50", "INCOME", { incomeOpportunityId: second.id }),
      );
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "800", "INCOME"),
      );
      const now = DateTime.fromISO("2026-03-03", { zone: "Europe/Amsterdam" });
      const metrics = await getFinanceWork(
        userId,
        getPeriod(now.minus({ months: 1 }), "month"),
        now,
      );
      expect(metrics.channelIncome).toEqual([
        { channel: "REFERRAL", currency: "EUR", amountMinor: "15000" },
      ]);
      expect(metrics.opportunityIncome).toHaveLength(2);
      expect(metrics.cohort.paid).toBe(2);
    });
    it("supports one/many payment allocations, remainders, user completeness and invalidation", async () => {
      const a = await account();
      const first = await paidSession();
      const second = await paidSession();
      const payment = await saveFinancialTransaction(
        userId,
        transaction(a.id, "100", "INCOME"),
      );
      await replacePaymentAllocations(
        userId,
        payment.id,
        [
          { sessionId: first.id, amount: "40" },
          { sessionId: second.id, amount: "40" },
        ],
        "yes",
      );
      expect(
        await prisma.session.count({
          where: { userId, paymentAttributionCompleteAt: { not: null } },
        }),
      ).toBe(2);
      const later = await saveFinancialTransaction(
        userId,
        transaction(a.id, "50", "INCOME"),
      );
      await replacePaymentAllocations(
        userId,
        later.id,
        [{ sessionId: first.id, amount: "25" }],
        "no",
      );
      expect(
        (await prisma.session.findUniqueOrThrow({ where: { id: first.id } }))
          .paymentAttributionCompleteAt,
      ).toBeNull();
      await replacePaymentAllocations(
        userId,
        payment.id,
        [{ sessionId: first.id, amount: "50" }],
        "unsure",
      );
      expect(
        (await prisma.session.findUniqueOrThrow({ where: { id: second.id } }))
          .paymentAttributionCompleteAt,
      ).toBeNull();
      await replacePaymentAllocations(
        userId,
        payment.id,
        [{ sessionId: first.id, amount: "100" }],
        "yes",
      );
      await saveFinancialTransaction(
        userId,
        transaction(a.id, "120", "INCOME"),
        payment.id,
      );
      expect(
        (await prisma.session.findUniqueOrThrow({ where: { id: first.id } }))
          .paymentAttributionCompleteAt,
      ).toBeNull();
      await replacePaymentAllocations(
        userId,
        payment.id,
        [{ sessionId: first.id, amount: "100" }],
        "yes",
      );
      await deleteFinancialTransaction(userId, payment.id);
      expect(
        (await prisma.session.findUniqueOrThrow({ where: { id: first.id } }))
          .paymentAttributionCompleteAt,
      ).toBeNull();
    });
    it("rejects ineligible/cross-owner payment allocations and serializes replacement races", async () => {
      const a = await account();
      const first = await paidSession();
      const second = await paidSession();
      const payment = await saveFinancialTransaction(
        userId,
        transaction(a.id, "100", "INCOME"),
      );
      await expect(
        replacePaymentAllocations(
          userId,
          payment.id,
          [{ sessionId: first.id, amount: "101" }],
          "yes",
        ),
      ).rejects.toThrow();
      await expect(
        replacePaymentAllocations(
          otherUserId,
          payment.id,
          [{ sessionId: first.id, amount: "1" }],
          "yes",
        ),
      ).rejects.toThrow();
      const gift = await saveFinancialTransaction(
        userId,
        transaction(a.id, "100", "INCOME", { inflowKind: "GIFT" }),
      );
      await expect(
        replacePaymentAllocations(
          userId,
          gift.id,
          [{ sessionId: first.id, amount: "1" }],
          "yes",
        ),
      ).rejects.toThrow();
      await Promise.all([
        replacePaymentAllocations(
          userId,
          payment.id,
          [{ sessionId: first.id, amount: "80" }],
          "yes",
        ),
        replacePaymentAllocations(
          userId,
          payment.id,
          [{ sessionId: second.id, amount: "80" }],
          "yes",
        ),
      ]);
      expect(
        (
          await prisma.paymentSessionAllocation.aggregate({
            where: { transactionId: payment.id },
            _sum: { amountMinor: true },
          })
        )._sum.amountMinor,
      ).toBe(8000n);
      await prisma.session.update({
        where: { id: first.id },
        data: { financeActivityKind: "ASSESSMENT" },
      });
      await expect(
        replacePaymentAllocations(
          userId,
          payment.id,
          [{ sessionId: first.id, amount: "1" }],
          "yes",
        ),
      ).rejects.toThrow();
    });
  },
);
