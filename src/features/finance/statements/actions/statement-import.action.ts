"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  previewStatementImport,
  confirmStatementImport,
} from "../services/statement-import.service";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function previewStatementAction(data: FormData) {
  return financeMutation(async (userId) => {
    const file = data.get("file");
    if (!(file instanceof File))
      throw new FinanceError("Choose a statement file.");
    let mapping: unknown = {};
    try {
      mapping = JSON.parse(String(data.get("mapping") || "{}"));
    } catch {
      throw new FinanceError("Check the column mapping.");
    }
    return previewStatementImport(
      userId,
      String(data.get("accountId") ?? ""),
      { name: file.name, data: new Uint8Array(await file.arrayBuffer()) },
      mapping,
    );
  });
}
export async function confirmStatementAction(data: FormData) {
  return financeMutation((userId) =>
    confirmStatementImport(userId, String(data.get("importId") ?? "")),
  );
}
