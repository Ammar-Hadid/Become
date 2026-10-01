import { createHash, createPrivateKey, sign } from "node:crypto";
import {
  counterpartyNameIdentity,
  normalizeExternalIdentity,
} from "@/features/finance/evidence/utils/financial-evidence.util";
import { parseMoney } from "@/lib/money/utils/money.util";
import type { Prisma } from "@/generated/prisma/client";
import {
  enableAccountSchema,
  enableBalanceSchema,
  enableTransactionSchema,
} from "../schemas/enable-banking.schema";
import type {
  BankBalanceObservation,
  BankExternalAccount,
  BankTransactionObservation,
} from "../types/bank-provider.types";

export const bankHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function bankIdentityHash(identifier: string) {
  return normalizeExternalIdentity(identifier);
}

export function enableBankingJwt(
  appId: string,
  privateKey: string,
  now = new Date(),
) {
  const key = createPrivateKey(privateKey);
  if (
    key.asymmetricKeyType !== "rsa" ||
    (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
  )
    throw new Error(
      "Enable Banking requires an RSA private key of at least 2048 bits.",
    );
  const iat = Math.floor(now.getTime() / 1000);
  const encoded = [
    { typ: "JWT", alg: "RS256", kid: appId },
    {
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat,
      exp: iat + 600,
    },
  ]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  return `${encoded}.${sign("RSA-SHA256", Buffer.from(encoded), key).toString("base64url")}`;
}

function jsonObject(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value));
}
function identifier(
  value: { iban?: string; other?: { identification: string } } | undefined,
) {
  return value?.iban ?? value?.other?.identification ?? null;
}
export function normalizeEnableAccount(value: unknown): BankExternalAccount {
  const account = enableAccountSchema.parse(value);
  const id = identifier(account.account_id);
  return {
    providerAccountId: account.uid,
    identityKey: account.identification_hash,
    identityAliases: [
      ...new Set([
        ...(account.identification_hashes ?? []),
        ...(id ? [bankIdentityHash(id)] : []),
      ]),
    ],
    externalType:
      (
        { CACC: "CURRENT", SVGS: "SAVINGS", CARD: "CARD" } as Record<
          string,
          string
        >
      )[account.cash_account_type ?? ""] ??
      account.cash_account_type ??
      "UNKNOWN",
    currency: account.currency.toUpperCase(),
    maskedIdentifier: id ? `•••• ${id.replace(/\s/g, "").slice(-4)}` : null,
  };
}
export function normalizeEnableTransaction(
  value: unknown,
): BankTransactionObservation {
  const transaction = enableTransactionSchema.parse(value);
  const activityDate =
    transaction.transaction_date ??
    transaction.booking_date ??
    transaction.value_date;
  if (!activityDate)
    throw new Error(
      "Bank transaction has no activity date; reconnect or review the provider data.",
    );
  const magnitude = parseMoney(
    transaction.transaction_amount.amount,
    transaction.transaction_amount.currency,
  );
  if (magnitude === 0n)
    throw new Error(
      "Bank transaction has a zero amount and cannot be posted automatically.",
    );
  const counterparty =
    transaction.credit_debit_indicator === "DBIT"
      ? transaction.creditor
      : transaction.debtor;
  const counterpartyAccount =
    transaction.credit_debit_indicator === "DBIT"
      ? transaction.creditor_account
      : transaction.debtor_account;
  const counterpartyId = identifier(counterpartyAccount);
  // transaction_id is a mutable detail-fetch handle, never a deduplication key.
  const { transaction_id: mutableHandle, ...fingerprintFields } = transaction;
  void mutableHandle;
  return {
    reference: transaction.entry_reference || null,
    fingerprint: bankHash(JSON.stringify(fingerprintFields)),
    status: transaction.status === "BOOK" ? "BOOKED" : "PENDING",
    amountMinor: magnitude < 0n ? -magnitude : magnitude,
    currency: transaction.transaction_amount.currency.toUpperCase(),
    direction:
      transaction.credit_debit_indicator === "DBIT" ? "DEBIT" : "CREDIT",
    activityDate,
    bookingDate: transaction.booking_date ?? null,
    valueDate: transaction.value_date ?? null,
    datePrecision: "DATE",
    counterpartyName: counterparty?.name ?? null,
    counterpartyIdentity: counterpartyId
      ? bankIdentityHash(counterpartyId)
      : counterparty?.name
        ? counterpartyNameIdentity(counterparty.name)
        : null,
    ownCounterpartyIdentity: counterpartyId
      ? bankIdentityHash(counterpartyId)
      : null,
    description: (transaction.remittance_information ?? [])
      .join(" · ")
      .slice(0, 2000),
    raw: jsonObject(value),
  };
}
export function normalizeEnableBalance(
  value: unknown,
  now = new Date(),
): BankBalanceObservation {
  const balance = enableBalanceSchema.parse(value);
  return {
    balanceMinor: parseMoney(
      balance.balance_amount.amount,
      balance.balance_amount.currency,
    ),
    currency: balance.balance_amount.currency.toUpperCase(),
    balanceType: balance.balance_type,
    // Observation freshness is retrieval time. Bank value/change dates remain immutable in raw.
    observedAt: now,
    includesPending: ["XPCD", "ITAV", "CLAV", "FWAV"].includes(
      balance.balance_type,
    ),
    raw: jsonObject(value),
  };
}

export function parseBankRetryAfter(
  value: string | null,
  now = new Date(),
): Date | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0)
    return new Date(now.getTime() + seconds * 1000);
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
}
