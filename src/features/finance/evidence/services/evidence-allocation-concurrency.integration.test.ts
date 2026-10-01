import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ingestFinancialEvidence } from "./financial-evidence.service";
import { lockFinancialTransaction } from "@/features/finance/transactions/services/transaction-lock.service";
import { allocateGoalExpense } from "@/features/finance/savings/services/goal-purchase.service";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";

describe.skipIf(process.env.RUN_FINANCE_INTEGRATION !== "1")(
  "source correction versus existing goal allocation",
  () => {
    afterAll(() => prisma.$disconnect());
    it("waits for allocation writers before accepting a reduced source amount", async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.pathname !== "/become_open_banking_test"
      )
        throw new Error("Use the dedicated isolated banking test database.");
      const user = await prisma.user.create({
        data: {
          name: "Correction race",
          email: `${randomUUID()}@example.test`,
        },
      });
      const userId = user.id;
      const account = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Card",
          type: "CREDIT_CARD",
          repaymentMethod: "MANUAL",
          currency: "EUR",
        },
      });
      const goal = await prisma.savingsGoal.create({
        data: {
          userId,
          name: "Goal",
          currency: "EUR",
          targetAmountMinor: 10000n,
        },
      });
      let releaseAllocation!: () => void;
      const release = new Promise<void>((resolve) => {
        releaseAllocation = resolve;
      });
      let acquired!: () => void;
      const held = new Promise<void>((resolve) => {
        acquired = resolve;
      });
      let allocation: Promise<void> | undefined;
      let correction: ReturnType<typeof prisma.$transaction> | undefined;
      try {
        const input = {
          source: "STATEMENT_IMPORT" as const,
          accountId: account.id,
          reference: "purchase",
          amountMinor: 10000n,
          currency: "EUR",
          direction: "DEBIT" as const,
          status: "BOOKED" as const,
          activityDate: financeToday().toISODate()!,
          raw: {},
        };
        const first = await ingestFinancialEvidence(userId, input);
        allocation = prisma.$transaction(
          async (tx) => {
            await lockFinancialTransaction(tx, userId, first.transactionId!);
            acquired();
            await release;
            await allocateGoalExpense(
              tx,
              userId,
              first.transactionId!,
              goal.id,
              8000n,
            );
          },
          { timeout: 10000 },
        );
        await held;
        let receivedPid!: (pid: number) => void;
        const pidPromise = new Promise<number>((resolve) => {
          receivedPid = resolve;
        });
        correction = prisma.$transaction(
          async (tx) => {
            const [process] = await tx.$queryRaw<
              { pid: number }[]
            >`SELECT pg_backend_pid() AS pid`;
            receivedPid(process.pid);
            return ingestFinancialEvidence(
              userId,
              { ...input, amountMinor: 5000n },
              tx,
            );
          },
          { timeout: 10000 },
        );
        const pid = await pidPromise;
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          await prisma.$executeRaw`SELECT pg_stat_clear_snapshot()`;
          const [state] = await prisma.$queryRaw<
            { waiting: boolean }[]
          >`SELECT wait_event_type = 'Lock' AS waiting FROM pg_stat_activity WHERE pid=${pid}`;
          if (state?.waiting) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        releaseAllocation();
        await Promise.all([allocation, correction]);
        expect(
          await prisma.financialTransaction.findUniqueOrThrow({
            where: { id: first.transactionId! },
          }),
        ).toMatchObject({ amountMinor: 10000n, reviewedAt: null });
        expect(
          await prisma.savingsGoalExpenseAllocation.findFirstOrThrow({
            where: { userId },
          }),
        ).toMatchObject({ amountMinor: 8000n });
        expect(
          await prisma.financialEvidenceLink.count({
            where: { userId, status: "DUPLICATE_REVIEW" },
          }),
        ).toBe(1);
      } finally {
        releaseAllocation();
        await Promise.allSettled(
          [allocation, correction].filter((promise) => promise !== undefined),
        );
        const where = { userId };
        await prisma.financialEvidenceLink.deleteMany({ where });
        await prisma.financialEvidenceObservation.deleteMany({ where });
        await prisma.savingsGoalExpenseAllocation.deleteMany({ where });
        await prisma.financialTransaction.deleteMany({ where });
        await prisma.savingsGoal.deleteMany({ where });
        await prisma.financialAccount.deleteMany({ where });
        await prisma.user.delete({ where: { id: userId } });
      }
    });
  },
);
