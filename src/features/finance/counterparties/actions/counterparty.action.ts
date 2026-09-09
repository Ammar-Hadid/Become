"use server";

import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  archiveCounterparty,
  saveCounterparty,
} from "@/features/finance/counterparties/services/counterparty.service";

export async function saveCounterpartyAction(data: FormData) {
  return financeMutation((userId) =>
    saveCounterparty(userId, {
      id: String(data.get("id") || "") || null,
      name: data.get("name"),
    }),
  );
}

export async function archiveCounterpartyAction(data: FormData) {
  return financeMutation((userId) =>
    archiveCounterparty(userId, String(data.get("id"))),
  );
}
