"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  allocateBusinessReceipt,
  resolveBusinessAllocation,
} from "@/features/finance/business-receipts/services/business-receipt.service";
import { revalidatePath } from "next/cache";
export async function allocateBusinessReceiptAction(
  transactionId: string,
  form: FormData,
) {
  const result = await financeMutation((userId) =>
    allocateBusinessReceipt(
      userId,
      transactionId,
      String(form.get("captureKey")),
      {
        ...Object.fromEntries(form),
        segmentIds: form.getAll("segmentIds"),
        segmentNames: form.getAll("segmentNames").map(String),
      },
    ),
  );
  if (!result.error) revalidatePath("/entrepreneurship", "layout");
  return result;
}
export async function resolveBusinessAllocationAction(
  id: string,
  action: "WITHDRAW" | "RECONFIRM",
  form: FormData,
) {
  const result = await financeMutation((userId) =>
    resolveBusinessAllocation(
      userId,
      id,
      action,
      String(form.get("reason") ?? ""),
    ),
  );
  if (!result.error) revalidatePath("/entrepreneurship", "layout");
  return result;
}
