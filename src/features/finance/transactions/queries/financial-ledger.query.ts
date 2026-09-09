import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Prisma } from "@/generated/prisma/client";
export async function getFinancialLedger(
  userId: string,
  filters: {
    cursor?: string;
    type?: string;
    currency?: string;
    account?: string;
  } = {},
) {
  const cursor = filters.cursor
    ? await prisma.financialTransaction.findFirst({
        where: { id: filters.cursor, userId },
        select: { id: true, occurredAt: true },
      })
    : null;
  const where: Prisma.FinancialTransactionWhereInput = {
    userId,
    ...(filters.type && ["INCOME", "EXPENSE", "TRANSFER"].includes(filters.type)
      ? { type: filters.type as "INCOME" | "EXPENSE" | "TRANSFER" }
      : {}),
    ...(filters.currency ? { currency: filters.currency.toUpperCase() } : {}),
    ...(filters.account
      ? {
          OR: [
            { accountId: filters.account },
            { destinationAccountId: filters.account },
          ],
        }
      : {}),
    ...(cursor
      ? {
          AND: [
            {
              OR: [
                { occurredAt: { lt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            },
          ],
        }
      : {}),
  };
  const rows = await prisma.financialTransaction.findMany({
    where,
    include: {
      account: true,
      destinationAccount: true,
      expenseCategory: true,
      counterparty: true,
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 26,
  });
  return {
    rows: rows.slice(0, 25),
    nextCursor: rows.length > 25 ? rows[24].id : null,
  };
}
