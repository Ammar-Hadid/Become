"use server";
import { redirect } from "next/navigation";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveFinancialTransaction,
  deleteFinancialTransaction,
} from "@/features/finance/transactions/services/financial-transaction.service";
export async function saveTransactionAction(data: FormData) {
  return financeMutation((userId) =>
    saveFinancialTransaction(
      userId,
      Object.fromEntries(data),
      String(data.get("id") || "") || undefined,
    ),
  );
}
export async function deleteTransactionAction(data: FormData) {
  const result = await financeMutation((userId) =>
    deleteFinancialTransaction(userId, String(data.get("id"))),
  );
  if (result.error) return result;
  redirect("/finance/transactions");
}
