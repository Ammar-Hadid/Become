import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  accountSchema,
  snapshotSchema,
} from "@/features/finance/accounts/schemas/financial-account.schema";
import { FinanceError } from "@/features/finance/types/finance.types";
import { parseMoney } from "@/lib/money/utils/money.util";
import {
  financeToday,
  storedDay,
} from "@/features/finance/recurring/utils/recurring-calendar.util";

export async function createFinancialAccount(userId: string, input: unknown) {
  const data = accountSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    if (
      data.type === "CREDIT_CARD" &&
      data.repaymentMethod === "LINKED_ACCOUNT"
    ) {
      const settlement = await tx.financialAccount.findFirst({
        where: {
          id: data.settlementAccountId!,
          userId,
          currency: data.currency,
          archivedAt: null,
          type: { notIn: ["CREDIT_CARD", "INVESTMENT"] },
        },
      });
      if (!settlement)
        throw new FinanceError(
          "Choose an active owned settlement account in the same currency.",
        );
    }
    const account = await tx.financialAccount.create({
      data: {
        userId,
        name: data.name,
        bankName: data.bankName,
        type: data.type,
        currency: data.currency,
        includeInLiquidSavings: data.includeInLiquidSavings,
        dataSource: data.dataSource,
        repaymentMethod:
          data.type === "CREDIT_CARD" ? data.repaymentMethod : null,
        settlementAccountId:
          data.type === "CREDIT_CARD" &&
          data.repaymentMethod === "LINKED_ACCOUNT"
            ? data.settlementAccountId
            : null,
        creditLimitMinor: data.creditLimit?.trim()
          ? parseMoney(data.creditLimit, data.currency)
          : null,
        statementDueMinor: data.statementDue?.trim()
          ? parseMoney(data.statementDue, data.currency)
          : null,
        statementDueOn: data.statementDueOn || null,
        settlementDay: data.settlementDay ?? null,
      },
    });
    if (data.balanceMinor !== null && data.reconciledAt)
      await tx.financialAccountBalanceSnapshot.create({
        data: {
          userId,
          accountId: account.id,
          balanceMinor:
            data.type === "CREDIT_CARD"
              ? -(data.balanceMinor < 0n
                  ? -data.balanceMinor
                  : data.balanceMinor)
              : data.balanceMinor,
          reconciledAt: data.reconciledAt,
        },
      });
    return { id: account.id };
  });
}

export async function reconcileFinancialAccount(
  userId: string,
  input: unknown,
  snapshotId?: string,
) {
  const data = snapshotSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id = ${data.accountId} AND "userId" = ${userId} FOR UPDATE`;
    const account = await tx.financialAccount.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) throw new FinanceError("Account not found.");
    let balanceMinor: bigint;
    try {
      balanceMinor = parseMoney(data.balance, account.currency);
      if (account.type === "CREDIT_CARD")
        balanceMinor = -(balanceMinor < 0n ? -balanceMinor : balanceMinor);
    } catch (error) {
      throw new FinanceError((error as Error).message);
    }
    const values = {
      userId,
      accountId: account.id,
      balanceMinor,
      reconciledAt: data.reconciledAt,
      notes: data.notes,
    };
    if (snapshotId)
      await tx.financialAccountBalanceSnapshot.update({
        where: { id: snapshotId, userId, accountId: account.id },
        data: values,
      });
    else await tx.financialAccountBalanceSnapshot.create({ data: values });
  });
}

export async function deleteFinancialAccountSnapshot(
  userId: string,
  snapshotId: string,
) {
  await prisma.$transaction(async (tx) => {
    const snapshot = await tx.financialAccountBalanceSnapshot.findFirst({
      where: { id: snapshotId, userId },
      select: { accountId: true },
    });
    if (!snapshot) throw new FinanceError("Reconciliation not found.");
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id = ${snapshot.accountId} AND "userId" = ${userId} FOR UPDATE`;
    await tx.financialAccountBalanceSnapshot.delete({
      where: { id: snapshotId, userId },
    });
  });
}

export async function updateFinancialAccount(
  userId: string,
  id: string,
  data: {
    name?: string;
    bankName?: string | null;
    includeInLiquidSavings?: boolean;
    archivedAt?: Date | null;
  },
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
    if (
      data.archivedAt &&
      (await tx.recurringExpense.findFirst({
        where: {
          userId,
          accountId: id,
          status: "ACTIVE",
          archivedAt: null,
          OR: [{ endOn: null }, { endOn: { gte: storedDay(financeToday()) } }],
        },
      }))
    )
      throw new FinanceError(
        "Reassign, pause, end or archive active recurring expenses before archiving this account.",
      );
    await tx.financialAccount.update({ where: { id, userId }, data });
  });
}
