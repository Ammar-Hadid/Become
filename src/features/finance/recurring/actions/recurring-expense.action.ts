"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveRecurringDefinition,
  setRecurringStatus,
} from "@/features/finance/recurring/services/recurring-definition.service";
import { z } from "zod";
import {
  catchUpRecurring,
  resolveRecurringOccurrence,
} from "@/features/finance/recurring/services/recurring-processing.service";
export async function saveRecurringAction(data: FormData) {
  return financeMutation(async (userId) => {
    const result = await saveRecurringDefinition(
      userId,
      {
        ...Object.fromEntries(data),
        dayOfWeek: data.get("dayOfWeek") || null,
        dayOfMonth: data.get("dayOfMonth") || null,
        monthOfYear: data.get("monthOfYear") || null,
      },
      String(data.get("id") || "") || undefined,
      String(data.get("todayEffect") || ""),
    );
    return { id: result.id };
  });
}
export async function checkRecurringAction() {
  return financeMutation((userId) => catchUpRecurring(userId));
}
export async function confirmOccurrenceAction(data: FormData) {
  return financeMutation((userId) =>
    resolveRecurringOccurrence(
      userId,
      String(data.get("occurrenceId")),
      "confirm",
      Object.fromEntries(data),
    ),
  );
}
export async function skipOccurrenceAction(data: FormData) {
  return financeMutation((userId) =>
    resolveRecurringOccurrence(
      userId,
      String(data.get("occurrenceId")),
      "skip",
    ),
  );
}
export async function recurringStatusAction(data: FormData) {
  return financeMutation((userId) =>
    setRecurringStatus(
      userId,
      String(data.get("id")),
      z.enum(["pause", "resume", "archive"]).parse(data.get("command")),
    ),
  );
}

export async function linkOccurrenceAction(data: FormData) {
  return financeMutation(async (userId) => {
    const { prisma } = await import("@/lib/db/adapters/prisma.adapter");
    const { linkRecurringTransaction } =
      await import("@/features/finance/recurring/services/recurring-matching.service");
    await prisma.$transaction((tx) =>
      linkRecurringTransaction(
        tx,
        userId,
        String(data.get("occurrenceId") || ""),
        String(data.get("transactionId") || ""),
      ),
    );
  });
}
export async function confirmRecurringSuggestionAction(data: FormData) {
  return financeMutation(async (userId) => {
    const { confirmRecurringSuggestion } =
      await import("@/features/finance/recurring/services/recurring-suggestion.service");
    return confirmRecurringSuggestion(
      userId,
      z.string().min(1).max(1000).parse(data.get("key")),
    );
  });
}
