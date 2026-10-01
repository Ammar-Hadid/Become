import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
const suitableBalanceTypes = [
  "ITBD",
  "BOOKED",
  "INTERIM_BOOKED",
  "CLBD",
  "CLOSING_BOOKED",
  "EXPECTED",
  "XPCD",
  "PRCD",
  "OPBD",
];
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
      externalAccounts: {
        select: { connection: { select: { institutionName: true } } },
        orderBy: { id: "asc" },
        take: 1,
      },
      snapshots: {
        where: { reconciledAt: { lte: at } },
        orderBy: { reconciledAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ currency: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return Promise.all(
    accounts.map(async ({ snapshots, externalAccounts, ...accountFields }) => {
      const account = {
        ...accountFields,
        institutionName:
          externalAccounts[0]?.connection.institutionName ??
          accountFields.bankName ??
          null,
      };
      const bankBalances =
        account.dataSource !== "MANUAL"
          ? await tx.financialBalanceObservation.findMany({
              where: {
                userId,
                currency: account.currency,
                observedAt: { lte: at },
                balanceType: { in: suitableBalanceTypes },
                OR: [
                  { accountId: account.id },
                  {
                    externalAccount: { financialAccountId: account.id, userId },
                  },
                ],
              },
              orderBy: [{ observedAt: "desc" }, { id: "desc" }],
              take: 20,
            })
          : [];
      const bank = bankBalances.toSorted(
        (a, b) =>
          b.observedAt.getTime() - a.observedAt.getTime() ||
          suitableBalanceTypes.indexOf(a.balanceType) -
            suitableBalanceTypes.indexOf(b.balanceType),
      )[0];
      const snapshot = snapshots[0];
      const useBank =
        bank && (!snapshot || bank.observedAt >= snapshot.reconciledAt);
      const baseline = useBank
        ? {
            amount: bank.balanceMinor,
            date: bank.observedAt,
            source: bank.source,
            includesPending: bank.includesPending,
          }
        : snapshot
          ? {
              amount: snapshot.balanceMinor,
              date: snapshot.reconciledAt,
              source: "MANUAL" as const,
              includesPending: false,
            }
          : null;
      const qualification = {
        balanceSource: baseline?.source ?? null,
        balanceIncludesPending: baseline?.includesPending ?? false,
        balanceCoverage: !baseline
          ? "UNAVAILABLE"
          : at.getTime() - baseline.date.getTime() > 30 * 86400000
            ? "STALE"
            : "KNOWN",
      };
      if (!baseline)
        return {
          ...account,
          balanceMinor: null,
          reconciledAt: null,
          ...qualification,
        };
      const occurredAt = { gt: baseline.date, lte: at };
      // Existing manual flows remain unchanged. Imported transfers use only observed movements.
      const flows = await tx.financialTransaction.groupBy({
        by: ["type", "accountId"],
        where: {
          userId,
          occurredAt,
          ...(excludingTransactionId
            ? { id: { not: excludingTransactionId } }
            : {}),
          evidenceLinks: {
            none: {
              status: "PROJECTED",
              observation: { bookingStatus: "BOOKED" },
            },
          },
          OR: [{ accountId: account.id }, { destinationAccountId: account.id }],
        },
        _sum: { amountMinor: true },
      });
      let balanceMinor = flows.reduce(
        (sum, f) =>
          sum +
          (f.type === "INCOME" || f.accountId !== account.id ? 1n : -1n) *
            (f._sum.amountMinor ?? 0n),
        baseline.amount,
      );
      const movements = await tx.financialEvidenceLink.findMany({
        where: {
          userId,
          accountId: account.id,
          status: "PROJECTED",
          transactionId: excludingTransactionId
            ? { not: excludingTransactionId }
            : { not: null },
          observation: { bookingStatus: "BOOKED", occurredAt },
        },
        include: { observation: true },
      });
      for (const m of movements)
        balanceMinor +=
          (m.observation.direction === "CREDIT" ? 1n : -1n) *
          m.observation.amountMinor;
      return {
        ...account,
        balanceMinor,
        reconciledAt: baseline.date,
        ...qualification,
      };
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
