import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { projectFinancialEvidence } from "@/features/finance/evidence/services/financial-evidence.service";
export async function materializeMappedEvidence(
  userId: string,
  externalId: string,
  tx?: Prisma.TransactionClient,
  take = 100,
) {
  const run = async (db: Prisma.TransactionClient) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const external = await db.externalBankAccount.findFirst({
      where: { id: externalId, userId },
    });
    if (!external?.financialAccountId) return { more: false };
    const links = await db.financialEvidenceLink.findMany({
      where: {
        userId,
        accountId: null,
        observation: { externalAccountId: externalId },
      },
      take,
      orderBy: { createdAt: "asc" },
    });
    for (const link of links) {
      await db.financialEvidenceLink.update({
        where: { id: link.id, userId },
        data: { accountId: external.financialAccountId },
      });
      await projectFinancialEvidence(db, userId, link.observationId);
    }
    return {
      more: !!(await db.financialEvidenceLink.findFirst({
        where: {
          userId,
          accountId: null,
          observation: { externalAccountId: externalId },
        },
      })),
    };
  };
  return tx ? run(tx) : prisma.$transaction(run, { timeout: 30000 });
}
export async function mapExternalFinancialAccount(
  userId: string,
  externalId: string,
  accountId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
      const external = await tx.externalBankAccount.findFirst({
        where: { id: externalId, userId },
      });
      const account = await tx.financialAccount.findFirst({
        where: { id: accountId, userId, archivedAt: null },
      });
      if (!external || !account || external.currency !== account.currency)
        throw new FinanceError(
          "Map to an active owned account in the same currency.",
        );
      if (
        external.financialAccountId &&
        external.financialAccountId !== accountId
      )
        throw new FinanceError(
          "This external account is already mapped. Preserve its history by reconnecting it.",
        );
      const conflict = await tx.externalBankAccount.findFirst({
        where: {
          userId,
          financialAccountId: accountId,
          id: { not: externalId },
        },
      });
      if (conflict)
        throw new FinanceError(
          "This Become account already has a bank mapping.",
        );
      await tx.$queryRaw`SELECT id FROM financial_account WHERE id=${accountId} AND "userId"=${userId} FOR NO KEY UPDATE`;
      await tx.externalBankAccount.update({
        where: { id: externalId, userId },
        data: { financialAccountId: accountId },
      });
      // Classification, nickname, Savings membership and goal allocations are deliberately preserved.
      await tx.financialAccount.update({
        where: { id: accountId, userId },
        data: { dataSource: "LIVE_SYNC" },
      });
      const result = await materializeMappedEvidence(userId, externalId, tx);
      if (
        result.more &&
        !(await tx.bankSyncJob.findFirst({
          where: {
            userId,
            externalAccountId: externalId,
            status: { in: ["QUEUED", "RUNNING"] },
          },
        }))
      )
        await tx.bankSyncJob.create({
          data: {
            userId,
            connectionId: external.connectionId,
            externalAccountId: externalId,
            trigger: "INITIAL",
            arguments: { materializeOnly: true },
          },
        });
      return { id: accountId };
    },
    { timeout: 30000 },
  );
}
