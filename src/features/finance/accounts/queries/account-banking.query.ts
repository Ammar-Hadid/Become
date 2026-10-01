import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getFinancialAccountBanking(
  userId: string,
  accountId: string,
) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return null;
  const [externalAccounts, latestBalance, pending, imports, unresolved] =
    await Promise.all([
      prisma.externalBankAccount.findMany({
        where: { userId, financialAccountId: accountId },
        include: {
          connection: {
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
            },
          },
        },
      }),
      prisma.financialBalanceObservation.findFirst({
        where: {
          userId,
          OR: [
            { accountId },
            { externalAccount: { financialAccountId: accountId, userId } },
          ],
        },
        orderBy: { observedAt: "desc" },
        select: {
          balanceMinor: true,
          source: true,
          balanceType: true,
          observedAt: true,
          includesPending: true,
        },
      }),
      prisma.financialEvidenceLink.findMany({
        where: {
          userId,
          accountId,
          status: "PROJECTED",
          observation: { bookingStatus: "PENDING" },
        },
        include: { observation: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.financialStatementImport.findMany({
        where: { userId, accountId, status: "CONFIRMED" },
        orderBy: { confirmedAt: "desc" },
        take: 10,
      }),
      prisma.financialEvidenceLink.findMany({
        where: {
          userId,
          accountId,
          observation: {
            OR: [
              { importId: null },
              { statementImport: { confirmedAt: { not: null } } },
            ],
          },
          OR: [
            { status: "DUPLICATE_REVIEW" },
            { status: "STAGED", needsAttention: { not: null } },
          ],
        },
        include: { observation: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
    ]);
  const coverage = imports[0]?.coverageThroughOn ?? null;
  return {
    account,
    externalAccounts,
    latestBalance,
    pending,
    imports,
    unresolved,
    coverage,
  };
}
