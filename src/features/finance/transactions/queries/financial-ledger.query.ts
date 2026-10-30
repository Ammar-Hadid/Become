import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";
import { evidenceDay } from "@/features/finance/evidence/utils/financial-evidence.util";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import type { Prisma } from "@/generated/prisma/client";
import {
  ledgerDateRange,
  type LedgerFilters,
} from "@/features/finance/transactions/utils/ledger-filter.util";

export type ReviewLedgerFilters = LedgerFilters & {
  day?: string;
  review?: string;
  category?: string;
  selected?: string;
};

export async function getFinancialLedger(
  userId: string,
  filters: ReviewLedgerFilters = {},
) {
  const today = financeToday();
  const day =
    filters.day ||
    filters.date ||
    (filters.review === "today" ? today.toISODate()! : undefined);
  const dayRange = day
    ? {
        gte: evidenceDay(day),
        lt: DateTime.fromISO(day, { zone: APP_TIMEZONE })
          .plus({ days: 1 })
          .toUTC()
          .toJSDate(),
      }
    : undefined;
  const periodRange = day ? undefined : ledgerDateRange(filters);
  const cursor = filters.cursor
    ? await prisma.financialTransaction.findFirst({
        where: { id: filters.cursor, userId },
        select: { id: true, occurredAt: true },
      })
    : null;
  const baseWhere: Prisma.FinancialTransactionWhereInput = {
    userId,
    ...(filters.review === "previous" ? { reviewedAt: null } : {}),
    ...(["unreviewed", "unknown"].includes(filters.review ?? "")
      ? { reviewedAt: null }
      : filters.review === "reviewed"
        ? { reviewedAt: { not: null } }
        : {}),
    ...(filters.review === "unknown"
      ? {
          counterpartyId: null,
          dataSource: { not: "MANUAL" },
          type: { not: "TRANSFER" },
        }
      : {}),
    ...(filters.category ? { expenseCategoryId: filters.category } : {}),
    ...(filters.counterparty ? { counterpartyId: filters.counterparty } : {}),
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
    AND: [
      ...(dayRange
        ? [
            {
              OR: [
                { activityOn: day },
                { activityOn: null, occurredAt: dayRange },
              ],
            },
          ]
        : periodRange
          ? [{ occurredAt: periodRange }]
          : []),
      ...(filters.review === "previous"
        ? [
            {
              OR: [
                { activityOn: { lt: today.toISODate()! } },
                {
                  activityOn: null,
                  occurredAt: { lt: today.toUTC().toJSDate() },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const [rows, summary] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        ...baseWhere,
        ...(cursor
          ? {
              AND: [
                ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
                {
                  OR: [
                    { occurredAt: { lt: cursor.occurredAt } },
                    { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: {
        evidenceLinks: {
          where: { status: "PROJECTED" },
          include: { observation: true },
        },
        account: true,
        destinationAccount: true,
        expenseCategory: true,
        counterparty: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 26,
    }),
    prisma.financialTransaction.groupBy({
      by: ["currency", "type"],
      where: baseWhere,
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
  ]);
  return {
    rows: rows.slice(0, 25),
    nextCursor: rows.length > 25 ? rows[24].id : null,
    summary,
  };
}
