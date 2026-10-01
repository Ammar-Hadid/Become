"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { updateCreditCardConfiguration } from "../services/credit-card-configuration.service";

export async function updateCreditCardConfigurationAction(data: FormData) {
  return financeMutation((userId) =>
    updateCreditCardConfiguration(
      userId,
      String(data.get("id") || ""),
      Object.fromEntries(data),
    ),
  );
}
