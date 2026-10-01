"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { mapExternalFinancialAccount } from "../services/bank-account-mapping.service";
export async function mapExternalAccountAction(data: FormData) {
  return financeMutation((userId) =>
    mapExternalFinancialAccount(
      userId,
      String(data.get("externalId") ?? ""),
      String(data.get("accountId") ?? ""),
    ),
  );
}
