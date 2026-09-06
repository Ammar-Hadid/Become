"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  createFinancialAccount,
  deleteFinancialAccountSnapshot,
  reconcileFinancialAccount,
  updateFinancialAccount,
} from "@/features/finance/accounts/services/financial-account.service";
import { financeName } from "@/features/finance/schemas/finance.schema";
export async function createAccountAction(data: FormData) {
  return financeMutation((userId) =>
    createFinancialAccount(userId, {
      ...Object.fromEntries(data),
      includeInLiquidSavings: data.has("includeInLiquidSavings"),
    }),
  );
}
export async function reconcileAccountAction(data: FormData) {
  return financeMutation((userId) =>
    reconcileFinancialAccount(
      userId,
      Object.fromEntries(data),
      String(data.get("snapshotId") || "") || undefined,
    ),
  );
}
export async function updateAccountAction(data: FormData) {
  return financeMutation((userId) =>
    updateFinancialAccount(userId, String(data.get("id")), {
      name: financeName.parse(data.get("name")),
      includeInLiquidSavings: data.has("includeInLiquidSavings"),
    }),
  );
}
export async function archiveAccountAction(data: FormData) {
  return financeMutation((userId) =>
    updateFinancialAccount(userId, String(data.get("id")), {
      archivedAt: data.get("restore") ? null : new Date(),
    }),
  );
}
export async function deleteSnapshotAction(data: FormData) {
  return financeMutation((userId) =>
    deleteFinancialAccountSnapshot(userId, String(data.get("snapshotId"))),
  );
}
