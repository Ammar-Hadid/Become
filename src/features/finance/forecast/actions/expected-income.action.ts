"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveExpectedIncome,
  archiveExpectedIncome,
} from "@/features/finance/forecast/services/expected-income.service";
export async function saveExpectedIncomeAction(data: FormData) {
  return financeMutation(async (userId) => {
    const result = await saveExpectedIncome(
      userId,
      {
        ...Object.fromEntries(data),
        recurrenceFrequency: data.get("recurrenceFrequency") || null,
      },
      String(data.get("id") || "") || undefined,
    );
    return { id: result.id };
  });
}
export async function archiveExpectedIncomeAction(data: FormData) {
  return financeMutation((userId) =>
    archiveExpectedIncome(userId, String(data.get("id") || "")),
  );
}

export async function linkExpectedIncomeAction(data: FormData) {
  return financeMutation(async (userId) => {
    const { prisma } = await import("@/lib/db/adapters/prisma.adapter");
    const { linkExpectedIncomeTransaction } =
      await import("@/features/finance/forecast/services/expected-income-matching.service");
    await prisma.$transaction((tx) =>
      linkExpectedIncomeTransaction(
        tx,
        userId,
        String(data.get("expectedIncomeId") || ""),
        String(data.get("transactionId") || ""),
        String(data.get("dueOn") || ""),
      ),
    );
  });
}
