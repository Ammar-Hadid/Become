import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";
import { evidenceDay } from "@/features/finance/evidence/utils/financial-evidence.util";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import type { Prisma } from "@/generated/prisma/client";
export async function getFinancialLedger(
  userId: string,
  filters: {
    cursor?: string;
    type?: string;
    currency?: string;
    account?: string;
    day?: string;
    review?: string;
    category?: string;
    counterparty?: string;
  } = {},
) {
  const today = financeToday();
  const day =
    filters.day ||
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
  const cursor = filters.cursor
    ? await prisma.financialTransaction.findFirst({
        where: { id: filters.cursor, userId },
        select: { id: true, occurredAt: true },
      })
    : null;
  const where: Prisma.FinancialTransactionWhereInput = {
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
      ...(cursor
        ? [
            {
              OR: [
                { occurredAt: { lt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            },
          ]
        : []),
    ],
  };
  const rows = await prisma.financialTransaction.findMany({
    where,
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
  });
  return {
    rows: rows.slice(0, 25),
    nextCursor: rows.length > 25 ? rows[24].id : null,
  };
}
