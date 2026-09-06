"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  archiveExpenseCategory,
  saveExpenseCategory,
} from "@/features/finance/categories/services/expense-category.service";
export async function saveCategoryAction(data: FormData) {
  return financeMutation((userId) =>
    saveExpenseCategory(userId, {
      id: String(data.get("id") || "") || null,
      name: data.get("name"),
    }),
  );
}
export async function archiveCategoryAction(data: FormData) {
  return financeMutation((userId) =>
    archiveExpenseCategory(userId, String(data.get("id"))),
  );
}
