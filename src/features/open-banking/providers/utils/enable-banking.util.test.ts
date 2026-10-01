import {
  counterpartyNameIdentity,
  normalizeExternalIdentity,
} from "@/features/finance/evidence/utils/financial-evidence.util";
import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  enableBankingJwt,
  normalizeEnableAccount,
  normalizeEnableBalance,
  normalizeEnableTransaction,
  parseBankRetryAfter,
} from "./enable-banking.util";

const transaction = {
  entry_reference: "stable",
  transaction_id: "temporary",
  transaction_amount: { amount: "87.42", currency: "EUR" },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  booking_date: "2026-03-29",
  creditor: { name: "Shop" },
  remittance_information: ["Purchase"],
};
describe("Enable Banking normalization", () => {
  it("does not call an unchanged account stale merely because its last movement was long ago", () => {
    const now = new Date("2026-10-01T08:00:00Z");
    expect(
      normalizeEnableBalance(
        {
          name: "Booked",
          balance_amount: { amount: "200.00", currency: "EUR" },
          balance_type: "ITBD",
          last_change_date_time: "2020-01-01T00:00:00Z",
        },
        now,
      ).observedAt,
    ).toEqual(now);
  });
  it("uses the same explicitly confirmed name identity as statement imports, without treating it as transfer proof", () => {
    const normalized = normalizeEnableTransaction({
      ...transaction,
      creditor: { name: "  Coffee   SHOP " },
    });
    expect(normalized.counterpartyIdentity).toBe(
      counterpartyNameIdentity("coffee shop"),
    );
    expect(normalized.ownCounterpartyIdentity).toBeNull();
  });
  it("prefers real account identifiers over name aliases and shares identifier normalization", () => {
    const normalized = normalizeEnableTransaction({
      ...transaction,
      creditor_account: { iban: "NL12 BANK1234567890" },
    });
    expect(normalized.counterpartyIdentity).toBe(
      normalizeExternalIdentity("NL12BANK1234567890"),
    );
    expect(normalized.ownCounterpartyIdentity).toBe(
      normalized.counterpartyIdentity,
    );
  });
  it("keeps the bank date and stable reference without floating-point money", () => {
    expect(normalizeEnableTransaction(transaction)).toMatchObject({
      reference: "stable",
      amountMinor: 8742n,
      activityDate: "2026-03-29",
      datePrecision: "DATE",
      direction: "DEBIT",
    });
    expect(
      normalizeEnableTransaction({ ...transaction, transaction_id: "changed" })
        .fingerprint,
    ).toBe(normalizeEnableTransaction(transaction).fingerprint);
  });
  it("does not turn a mutable details handle into transaction identity", () => {
    expect(
      normalizeEnableTransaction({ ...transaction, entry_reference: undefined })
        .reference,
    ).toBeNull();
  });
  it("keeps pending status and revised booked amount distinct", () => {
    expect(
      normalizeEnableTransaction({
        ...transaction,
        status: "PDNG",
        transaction_amount: { amount: "100.00", currency: "EUR" },
      }),
    ).toMatchObject({ status: "PENDING", amountMinor: 10000n });
  });
  it("does not infer a transaction date from import time", () => {
    expect(() =>
      normalizeEnableTransaction({ ...transaction, booking_date: undefined }),
    ).toThrow("no activity date");
  });
  it("retains external classification without a Become account classification", () => {
    expect(
      normalizeEnableAccount({
        uid: "session-account",
        identification_hash: "persistent",
        account_id: { iban: "NL12BANK1234567890" },
        cash_account_type: "CACC",
        currency: "EUR",
      }),
    ).toMatchObject({
      identityKey: "persistent",
      externalType: "CURRENT",
      maskedIdentifier: "•••• 7890",
    });
  });
  it("accepts null unused account identifiers without inventing bank details", () => {
    const account = {
      uid: "sandbox-account",
      identification_hash: "stable-sandbox-identity",
      cash_account_type: "CACC",
      currency: "EUR",
    };
    expect(
      normalizeEnableAccount({
        ...account,
        account_id: { iban: "NL12BANK1234567890", other: null },
      }),
    ).toMatchObject({
      identityKey: "stable-sandbox-identity",
      maskedIdentifier: "•••• 7890",
    });
    expect(
      normalizeEnableAccount({
        ...account,
        account_id: {
          iban: null,
          other: { identification: "bank-account-4567", scheme_name: "BBAN" },
        },
      }).maskedIdentifier,
    ).toBe("•••• 4567");
    expect(
      normalizeEnableAccount({
        ...account,
        account_id: { iban: null, other: null },
      }).maskedIdentifier,
    ).toBeNull();
    expect(() =>
      normalizeEnableAccount({ ...account, account_id: { other: "invalid" } }),
    ).toThrow();
    expect(() =>
      normalizeEnableAccount({ ...account, currency: null }),
    ).toThrow();
  });
  it("recognizes transactions whose unused counterparty identifier is null", () => {
    const normalized = normalizeEnableTransaction({
      ...transaction,
      creditor_account: { iban: "NL12BANK1234567890", other: null },
    });
    expect(normalized.counterpartyIdentity).toBe(
      normalizeExternalIdentity("NL12BANK1234567890"),
    );
    expect(normalized.raw).toMatchObject({
      creditor_account: { iban: "NL12BANK1234567890", other: null },
    });
  });
  it("accepts an unavailable balance reference date while retaining raw evidence", () => {
    const value = {
      name: "Booked",
      balance_amount: { amount: "123.45", currency: "EUR" },
      balance_type: "ITBD",
      reference_date: null,
    };
    const now = new Date("2026-10-01T09:00:00Z");
    expect(normalizeEnableBalance(value, now)).toMatchObject({
      balanceMinor: 12345n,
      observedAt: now,
      raw: value,
    });
    expect(() =>
      normalizeEnableBalance({ ...value, reference_date: "not-a-date" }),
    ).toThrow();
    expect(() =>
      normalizeEnableBalance({
        ...value,
        balance_amount: { amount: null, currency: "EUR" },
      }),
    ).toThrow();
  });
  it("qualifies expected balances as already including pending movements", () => {
    expect(
      normalizeEnableBalance({
        name: "Expected",
        balance_amount: { amount: "-200.00", currency: "EUR" },
        balance_type: "XPCD",
      }),
    ).toMatchObject({ balanceMinor: -20000n, includesPending: true });
    expect(
      normalizeEnableBalance({
        name: "Booked",
        balance_amount: { amount: "200.00", currency: "EUR" },
        balance_type: "ITBD",
      }).includesPending,
    ).toBe(false);
  });
  it("honors either retry-after representation", () => {
    const now = new Date("2026-10-01T09:00:00Z");
    expect(parseBankRetryAfter("3600", now)?.toISOString()).toBe(
      "2026-10-01T10:00:00.000Z",
    );
    expect(
      parseBankRetryAfter("Thu, 01 Oct 2026 10:30:00 GMT", now)?.toISOString(),
    ).toBe("2026-10-01T10:30:00.000Z");
  });
  it("signs an app-scoped RS256 JWT without identifying any end user", () => {
    const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privateKey = pair.privateKey
      .export({ format: "pem", type: "pkcs8" })
      .toString();
    const token = enableBankingJwt(
      "application-id",
      privateKey,
      new Date("2026-10-01T09:00:00Z"),
    );
    const [head, payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
      kid: "application-id",
    });
    expect(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    ).toMatchObject({ iss: "enablebanking.com", aud: "api.enablebanking.com" });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${head}.${payload}`),
        pair.publicKey,
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });
});
