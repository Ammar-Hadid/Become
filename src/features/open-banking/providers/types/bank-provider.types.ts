import type { Prisma } from "@/generated/prisma/client";

export type BankInstitution = {
  name: string;
  country: string;
  logoUrl: string | null;
  maximumConsentSeconds: number;
  requiredPsuHeaders: string[];
};

export type BankExternalAccount = {
  providerAccountId: string;
  identityKey: string;
  identityAliases: string[];
  externalType: string;
  currency: string;
  maskedIdentifier: string | null;
};

export type BankTransactionObservation = {
  reference: string | null;
  fingerprint: string;
  status: "PENDING" | "BOOKED";
  amountMinor: bigint;
  currency: string;
  direction: "DEBIT" | "CREDIT";
  activityDate: string;
  bookingDate: string | null;
  valueDate: string | null;
  datePrecision: "DATE";
  counterpartyName: string | null;
  counterpartyIdentity: string | null;
  ownCounterpartyIdentity: string | null;
  description: string;
  raw: Prisma.InputJsonObject;
};

export type BankBalanceObservation = {
  balanceMinor: bigint;
  currency: string;
  balanceType: string;
  observedAt: Date;
  includesPending: boolean;
  raw: Prisma.InputJsonObject;
};

export type BankTransactionPageRequest = {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  continuationKey?: string;
  longestHistory?: boolean;
};

// PSU headers are accepted only for a request made while the user is present.
// Durable jobs never persist or replay browser presence/IP information.
export type BankInteractiveContext = { headers: Record<string, string> };

export interface BankDataProvider {
  readonly id: string;
  institutions(countries: string[]): Promise<BankInstitution[]>;
  beginAuthorization(input: {
    institution: BankInstitution;
    state: string;
    redirectUrl: string;
    userId: string;
  }): Promise<{ url: string }>;
  completeAuthorization(code: string): Promise<{
    sessionId: string;
    expiresAt: Date;
    institution: { name: string; country: string };
    accounts: BankExternalAccount[];
  }>;
  balances(
    accountId: string,
    context?: BankInteractiveContext,
  ): Promise<BankBalanceObservation[]>;
  transactions(
    input: BankTransactionPageRequest,
    context?: BankInteractiveContext,
  ): Promise<{
    observations: BankTransactionObservation[];
    continuationKey: string | null;
  }>;
  revoke(sessionId: string): Promise<void>;
}

export class BankProviderError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAt: Date | null = null,
  ) {
    super(`Bank provider request failed (${code}).`);
    this.name = "BankProviderError";
  }
}
