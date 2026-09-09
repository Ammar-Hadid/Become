import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { recurringSchema } from "@/features/finance/recurring/schemas/recurring-expense.schema";
import {
  storedDay,
  localDay,
  financeToday,
  recurringDueDates,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import {
  catchUpBeforeEdit,
  lockRecurring,
  processRecurringThrough,
} from "@/features/finance/recurring/services/recurring-processing.service";
export async function saveRecurringDefinition(
  userId: string,
  input: unknown,
  id?: string,
  todayEffect?: string,
) {
  const { amount, ...data } = recurringSchema.parse(input);
  void amount;
  if (id) await catchUpBeforeEdit(userId, id);
  return prisma.$transaction(async (tx) => {
    const old = id ? await lockRecurring(tx, userId, id) : null;
    await tx.$queryRaw`SELECT id FROM financial_account WHERE id = ${data.accountId} AND "userId" = ${userId} FOR SHARE`;
    const account = await tx.financialAccount.findFirst({
      where: {
        id: data.accountId,
        userId,
        archivedAt: null,
        currency: data.currency,
      },
    });
    if (!account)
      throw new FinanceError(
        "Choose an active account in the recurring currency.",
      );
    if (
      data.expenseCategoryId &&
      !(await tx.expenseCategory.findFirst({
        where: {
          id: data.expenseCategoryId,
          userId,
          ...(old?.expenseCategoryId === data.expenseCategoryId
            ? {}
            : { archivedAt: null }),
        },
      }))
    )
      throw new FinanceError("Category is unavailable.");
    if (
      data.counterpartyId &&
      !(await tx.counterparty.findFirst({
        where: {
          id: data.counterpartyId,
          userId,
          ...(old?.counterpartyId === data.counterpartyId
            ? {}
            : { archivedAt: null }),
        },
      }))
    )
      throw new FinanceError("Counterparty is unavailable.");
    if (old) {
      if (old.archivedAt)
        throw new FinanceError("Archived schedules cannot be edited.");
      const today = financeToday();
      const existing = await tx.recurringExpenseOccurrence.findUnique({
        where: {
          recurringExpenseId_dueOn: {
            recurringExpenseId: old.id,
            dueOn: storedDay(today),
          },
        },
      });
      const dueToday =
        old.status === "ACTIVE" &&
        (recurringDueDates(old, today, today).length > 0 ||
          recurringDueDates(data, today, today).length > 0);
      if (
        dueToday &&
        !existing &&
        !["today", "next"].includes(todayEffect ?? "")
      )
        throw new FinanceError(
          "This expense is due today. Choose Starting today or Starting next occurrence.",
        );
      if (!existing && todayEffect === "next")
        await processRecurringThrough(tx, old, today);
      const updated = await tx.recurringExpense.update({
        where: { id: old.id, userId },
        data: {
          ...data,
          ...(old.processedThroughOn > storedDay(today)
            ? { processedThroughOn: storedDay(today.minus({ days: 1 })) }
            : {}),
        },
      });
      if (dueToday && !existing && todayEffect === "today") {
        const reset = await tx.recurringExpense.update({
          where: { id: old.id },
          data: { processedThroughOn: storedDay(today.minus({ days: 1 })) },
        });
        await processRecurringThrough(tx, reset, today);
      }
      return updated;
    }
    return tx.recurringExpense.create({
      data: {
        ...data,
        userId,
        processedThroughOn: storedDay(
          localDay(data.startOn).minus({ days: 1 }),
        ),
      },
    });
  });
}
export async function setRecurringStatus(
  userId: string,
  id: string,
  command: "pause" | "resume" | "archive",
) {
  const today = financeToday();
  await catchUpBeforeEdit(userId, id);
  await prisma.$transaction(async (tx) => {
    const old = await lockRecurring(tx, userId, id);
    if (old.archivedAt)
      throw new FinanceError("Archived recurrence cannot resume.");
    if (command === "resume")
      await tx.$queryRaw`SELECT id FROM financial_account WHERE id = ${old.accountId} AND "userId" = ${userId} FOR SHARE`;
    if (
      command === "resume" &&
      !(await tx.financialAccount.findFirst({
        where: { id: old.accountId, userId, archivedAt: null },
      }))
    )
      throw new FinanceError("Reassign an active account before resuming.");
    await tx.recurringExpense.update({
      where: { id, userId },
      data:
        command === "archive"
          ? { archivedAt: new Date() }
          : command === "pause"
            ? { status: "PAUSED", pausedOn: storedDay(today) }
            : {
                status: "ACTIVE",
                pausedOn: null,
                processedThroughOn: storedDay(today.minus({ days: 1 })),
              },
    });
  });
}
