import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { evidenceDay } from "@/features/finance/evidence/utils/financial-evidence.util";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";
import { matchImportedRecurringTransaction } from "@/features/finance/recurring/services/recurring-matching.service";
export async function reviewFinancialTransactions(
  userId: string,
  ids: string[],
) {
  const safe = z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .parse([...new Set(ids)]);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const records = await tx.financialTransaction.findMany({
      where: { userId, id: { in: safe } },
      include: { evidenceLinks: { where: { status: "DUPLICATE_REVIEW" } } },
    });
    if (records.length !== safe.length)
      throw new FinanceError("Transaction is unavailable.");
    if (
      records.some(
        (r) =>
          r.evidenceLinks.length ||
          (r.dataSource !== "MANUAL" &&
            r.type !== "TRANSFER" &&
            !r.counterpartyId),
      )
    )
      throw new FinanceError(
        "Resolve unknown counterparties and uncertain evidence before review.",
      );
    await tx.financialTransaction.updateMany({
      where: { userId, id: { in: safe } },
      data: { reviewedAt: new Date() },
    });
  });
}
export async function reviewRecognizedTransactions(
  userId: string,
  dayInput: string,
) {
  const day = dayInput === "today" ? financeToday().toISODate()! : dayInput;
  const start = evidenceDay(day);
  const where: Prisma.FinancialTransactionWhereInput = {
    userId,
    activityOn: day,
    reviewedAt: null,
    OR: [
      { type: "TRANSFER" },
      { counterpartyId: { not: null } },
      { dataSource: "MANUAL" },
    ],
    evidenceLinks: { none: { status: "DUPLICATE_REVIEW" } },
  };
  // Instant/manual records do not have activityOn; use a calendar-aware window as well.
  const { DateTime } = await import("luxon");
  where.AND = [
    {
      OR: [
        { activityOn: day },
        {
          activityOn: null,
          occurredAt: {
            gte: start,
            lt: DateTime.fromJSDate(start)
              .setZone(financeToday().zoneName!)
              .plus({ days: 1 })
              .toJSDate(),
          },
        },
      ],
    },
  ];
  delete where.activityOn;
  await prisma.financialTransaction.updateMany({
    where,
    data: { reviewedAt: new Date() },
  });
}
const interpretation = z.object({
  id: z.string().min(1),
  counterpartyId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  rememberIdentity: z.boolean().optional(),
  refundOfId: z.string().nullable().optional(),
});
export async function interpretFinancialTransaction(
  userId: string,
  input: unknown,
) {
  const data = interpretation.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const record = await tx.financialTransaction.findFirst({
      where: { id: data.id, userId },
      include: {
        evidenceLinks: {
          where: { status: "PROJECTED" },
          include: { observation: true },
        },
      },
    });
    if (!record) throw new FinanceError("Transaction is unavailable.");
    if (
      data.counterpartyId &&
      !(await tx.counterparty.findFirst({
        where: { id: data.counterpartyId, userId, archivedAt: null },
      }))
    )
      throw new FinanceError("Choose an owned active counterparty.");
    if (
      data.categoryId &&
      !(await tx.expenseCategory.findFirst({
        where: { id: data.categoryId, userId, archivedAt: null },
      }))
    )
      throw new FinanceError("Choose an owned active category.");
    if (record.type === "TRANSFER" && data.counterpartyId)
      throw new FinanceError(
        "Owned transfers do not have an external counterparty.",
      );
    if (data.refundOfId) {
      const original = await tx.financialTransaction.findFirst({
        where: {
          id: data.refundOfId,
          userId,
          type: "EXPENSE",
          currency: record.currency,
        },
      });
      if (record.type !== "INCOME" || !original || original.id === record.id)
        throw new FinanceError(
          "Link this refund to an owned expense in the same currency.",
        );
    }
    await tx.financialTransaction.update({
      where: { id: record.id, userId },
      data: {
        counterpartyId: data.counterpartyId,
        expenseCategoryId:
          record.type === "EXPENSE" ? data.categoryId : undefined,
        notes: data.notes,
        tags: data.tags,
        refundOfId: data.refundOfId,
        ...(data.refundOfId ? { inflowKind: "REFUND" as const } : {}),
      },
    });
    if (data.rememberIdentity && data.counterpartyId)
      for (const link of record.evidenceLinks) {
        const key = link.observation.counterpartyIdentity;
        if (key)
          await tx.counterpartyIdentity.upsert({
            where: { userId_identityKey: { userId, identityKey: key } },
            create: {
              userId,
              identityKey: key,
              counterpartyId: data.counterpartyId,
              defaultCategoryId: data.categoryId,
            },
            update: {
              counterpartyId: data.counterpartyId,
              defaultCategoryId: data.categoryId,
              confirmedAt: new Date(),
            },
          });
      }
    await matchImportedRecurringTransaction(tx, userId, record.id);
    return { id: record.id };
  });
}
