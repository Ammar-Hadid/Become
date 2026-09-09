import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function getFinancialPosition(
  userId: string,
  at = new Date(),
  tx: Prisma.TransactionClient = prisma,
  excludingTransactionId?: string,
) {
  const accounts = await tx.financialAccount.findMany({
    where: {
      userId,
      AND: [
        {
          OR: [
            { createdAt: { lte: at } },
            { snapshots: { some: { reconciledAt: { lte: at } } } },
          ],
        },
        { OR: [{ archivedAt: null }, { archivedAt: { gt: at } }] },
      ],
    },
    include: {
      snapshots: {
        where: { reconciledAt: { lte: at } },
        orderBy: { reconciledAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ currency: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return Promise.all(
    accounts.map(async ({ snapshots, ...account }) => {
      const snapshot = snapshots[0];
      if (!snapshot)
        return { ...account, balanceMinor: null, reconciledAt: null };
      const occurredAt = { gt: snapshot.reconciledAt, lte: at };
      const flows = await tx.financialTransaction.groupBy({
        by: ["type", "accountId"],
        where: {
          userId,
          occurredAt,
          ...(excludingTransactionId
            ? { id: { not: excludingTransactionId } }
            : {}),
          OR: [{ accountId: account.id }, { destinationAccountId: account.id }],
        },
        _sum: { amountMinor: true },
      });
      const balanceMinor = flows.reduce(
        (balance, flow) =>
          balance +
          (flow.type === "INCOME" || flow.accountId !== account.id ? 1n : -1n) *
            (flow._sum.amountMinor ?? 0n),
        snapshot.balanceMinor,
      );
      return { ...account, balanceMinor, reconciledAt: snapshot.reconciledAt };
    }),
  );
}

export function sumPosition(
  accounts: { currency: string; balanceMinor: bigint | null }[],
) {
  const result = new Map<string, bigint | null>();
  for (const account of accounts) {
    const current = result.get(account.currency);
    result.set(
      account.currency,
      account.balanceMinor === null || current === null
        ? null
        : (current ?? 0n) + account.balanceMinor,
    );
  }
  return result;
}
