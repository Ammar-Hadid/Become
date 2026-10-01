"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  reviewFinancialTransactions,
  reviewRecognizedTransactions,
  interpretFinancialTransaction,
} from "../services/financial-review.service";
import { resolveFinancialEvidence } from "@/features/finance/evidence/services/financial-evidence.service";
import {
  confirmEvidenceTransfer,
  classifyIncomingEvidence,
} from "@/features/finance/evidence/services/evidence-transfer.service";
export async function reviewTransactionAction(data: FormData) {
  const ids = data.getAll("ids").map(String);
  if (!ids.length && data.get("id")) ids.push(String(data.get("id")));
  return financeMutation((userId) => reviewFinancialTransactions(userId, ids));
}
export async function reviewRecognizedAction(data: FormData) {
  return financeMutation((userId) =>
    reviewRecognizedTransactions(userId, String(data.get("day") ?? "today")),
  );
}
export async function categorizeTransactionAction(data: FormData) {
  return financeMutation((userId) =>
    interpretFinancialTransaction(userId, {
      id: String(data.get("id") ?? ""),
      categoryId: String(data.get("categoryId") ?? "") || null,
    }),
  );
}
export async function interpretTransactionAction(data: FormData) {
  return financeMutation((userId) =>
    interpretFinancialTransaction(userId, {
      id: String(data.get("id") ?? ""),
      ...(data.has("counterpartyId")
        ? { counterpartyId: String(data.get("counterpartyId")) || null }
        : {}),
      ...(data.has("categoryId")
        ? { categoryId: String(data.get("categoryId")) || null }
        : {}),
      ...(data.has("notes") ? { notes: String(data.get("notes")) } : {}),
      ...(data.has("tags")
        ? {
            tags: String(data.get("tags"))
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          }
        : {}),
      ...(data.has("refundOfId")
        ? { refundOfId: String(data.get("refundOfId")) || null }
        : {}),
      rememberIdentity: data.has("rememberIdentity"),
    }),
  );
}
export async function resolveEvidenceAction(data: FormData) {
  const decision = String(data.get("decision"));
  if (!["distinct", "duplicate", "ignore"].includes(decision))
    return { error: "Choose how to resolve this evidence." };
  return financeMutation((userId) =>
    resolveFinancialEvidence(
      userId,
      String(data.get("observationId")),
      decision as "distinct" | "duplicate" | "ignore",
      String(data.get("transactionId") ?? "") || undefined,
    ),
  );
}
export async function confirmEvidenceTransferAction(data: FormData) {
  return financeMutation((userId) =>
    confirmEvidenceTransfer(
      userId,
      String(data.get("observationId")),
      String(data.get("otherAccountId")),
    ),
  );
}

export async function classifyIncomingEvidenceAction(data: FormData) {
  const kind = String(data.get("inflowKind"));
  if (kind !== "REFUND" && kind !== "OTHER")
    return { error: "Choose Refund or Other incoming movement." };
  return financeMutation((userId) =>
    classifyIncomingEvidence(userId, String(data.get("observationId")), kind),
  );
}
