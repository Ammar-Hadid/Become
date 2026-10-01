import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getOpenBankingConfig } from "../../config/open-banking.config";
import { getBankDataProvider } from "../../providers/adapters/enable-banking.adapter";

export async function getBankInstitutions() {
  if (!getOpenBankingConfig().configured) return [];
  // Revolut may be listed under Lithuania, including Dutch personal customers.
  return getBankDataProvider().institutions(["NL", "LT"]);
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
