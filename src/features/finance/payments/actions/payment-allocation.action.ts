"use server";
import { z } from "zod";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { replacePaymentAllocations } from "@/features/finance/payments/services/payment-allocation.service";
export async function allocatePaymentAction(data: FormData) {
  return financeMutation((userId) =>
    replacePaymentAllocations(
      userId,
      String(data.get("transactionId")),
      data.getAll("sessionId").map((id) => ({
        sessionId: String(id),
        amount: String(data.get(`amount:${id}`) || ""),
      })),
      z.enum(["yes", "no", "unsure"]).parse(data.get("completeness")),
    ),
  );
}
