"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { saveFinanceReserve } from "@/features/finance/settings/services/finance-policy.service";
export async function saveReserveAction(data: FormData) {
  return financeMutation((userId) =>
    saveFinanceReserve(
      userId,
      String(data.get("currency")),
      String(data.get("reserve") ?? ""),
    ),
  );
}
