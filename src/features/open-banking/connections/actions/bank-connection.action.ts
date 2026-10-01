"use server";

import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { FinanceError } from "@/features/finance/types/finance.types";
import { BankProviderError } from "../../providers/types/bank-provider.types";
import {
  disconnectBankConnection,
  requestBankSynchronization,
  startBankAuthorization,
} from "../services/bank-connection.service";

export async function startBankConnectionAction(
  input: unknown,
): Promise<{ error: string | null; url?: string; connectionId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  try {
    return { error: null, ...(await startBankAuthorization(user.id, input)) };
  } catch (error) {
    return {
      error:
        error instanceof FinanceError
          ? error.message
          : error instanceof BankProviderError &&
              error.code === "NOT_CONFIGURED"
            ? "Bank connections need server setup first."
            : "Could not start bank authorization. Please try again.",
    };
  }
}

export async function syncBankConnectionAction(connectionId: string) {
  return financeMutation((userId) =>
    requestBankSynchronization(userId, connectionId),
  );
}

export async function disconnectBankConnectionAction(connectionId: string) {
  return financeMutation((userId) =>
    disconnectBankConnection(userId, connectionId),
  );
}
