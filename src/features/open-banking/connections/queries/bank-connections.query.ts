import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getOpenBankingConfig } from "../../config/open-banking.config";
import { getBankDataProvider } from "../../providers/adapters/enable-banking.adapter";
import {
  BankProviderError,
  type BankInstitution,
} from "../../providers/types/bank-provider.types";

type BankInstitutionCatalog = {
  status: "NOT_CONFIGURED" | "AVAILABLE" | "ACCESS_DENIED" | "UNAVAILABLE";
  institutions: BankInstitution[];
};

export async function getBankInstitutions(): Promise<BankInstitutionCatalog> {
  if (!getOpenBankingConfig().configured)
    return { status: "NOT_CONFIGURED", institutions: [] };
  try {
    // Revolut may be listed under Lithuania, including Dutch personal customers.
    const institutions = await getBankDataProvider().institutions(["NL", "LT"]);
    return { status: "AVAILABLE", institutions };
  } catch (error) {
    // Catalog outages must not hide existing connections or statement imports.
    // Expose only a bounded state; provider errors can contain sensitive details.
    return {
      status:
        error instanceof BankProviderError && [401, 403].includes(error.status)
          ? "ACCESS_DENIED"
          : "UNAVAILABLE",
      institutions: [],
    };
  }
}

export async function getBankConnections(userId: string) {
  const connections = await prisma.bankConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      institutionName: true,
      institutionCountry: true,
      institutionLogo: true,
      status: true,
      consentExpiresAt: true,
      lastSuccessAt: true,
      nextEligibleAt: true,
      externalAccounts: {
        select: {
          id: true,
          externalType: true,
          currency: true,
          maskedIdentifier: true,
          financialAccountId: true,
          lastSuccessAt: true,
        },
      },
      jobs: {
        where: { status: { in: ["QUEUED", "RUNNING", "FAILED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, nextAttemptAt: true, lastError: true },
      },
    },
  });
  return { configured: getOpenBankingConfig().configured, connections };
}
