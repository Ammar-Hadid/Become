import "dotenv/config";
import { getMediaStorage } from "../../src/lib/storage/services/media-storage.service";
import { prisma } from "../../src/lib/db/adapters/prisma.adapter";

// Call only for IDs returned by sign-up requests made by this test's own page.
export async function deleteDisposableBrowserUser(id: string, email: string) {
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  )
    throw new Error("Browser fixture cleanup requires local PostgreSQL.");
  if (!(await prisma.user.findFirst({ where: { id, email } }))) return;
  const where = { userId: id };
  const jobs = await prisma.seasonCotsSelection.findMany({
    where,
    select: { storageKey: true },
  });
  const media = await prisma.seasonMedia.findMany({
    where,
    select: { storageKey: true, previewStorageKey: true },
  });
  await prisma.$transaction(
    async (tx) => {
      await tx.userSeason.deleteMany({ where });
      await tx.experiment.updateMany({ where, data: { repeatedFromId: null } });
      await tx.experiment.deleteMany({ where });
      await tx.goal.deleteMany({ where });
      await tx.problemAssessmentEvidence.deleteMany({ where });
      await tx.problemAssessment.deleteMany({ where });
      await tx.problemEvidence.deleteMany({ where });
      await tx.businessReceiptAllocation.deleteMany({ where });
      await tx.offerEvent.deleteMany({ where });
      await tx.offerRevisionProblem.deleteMany({ where });
      await tx.followUp.deleteMany({ where });
      await tx.offerRevision.deleteMany({ where });
      await tx.offer.deleteMany({ where });
      await tx.observationRevision.deleteMany({ where });
      await tx.observation.deleteMany({ where });
      await tx.interactionRevision.deleteMany({ where });
      await tx.interaction.deleteMany({ where });
      await tx.problem.deleteMany({ where });
      await tx.paymentSessionAllocation.deleteMany({ where });
      await tx.savingsGoalExpenseAllocation.deleteMany({ where });
      await tx.engineeringEvidence.deleteMany({ where });
      await tx.financialTransaction.deleteMany({ where });
      await tx.recurringExpenseOccurrence.deleteMany({ where });
      await tx.recurringExpense.deleteMany({ where });
      await tx.session.deleteMany({ where });
      await tx.companyWorkSource.deleteMany({ where });
      await tx.companyNiche.deleteMany({ where });
      await tx.nicheDecision.deleteMany({ where });
      await tx.company.deleteMany({ where });
      await tx.niche.deleteMany({ where });
      await tx.incomeOpportunity.deleteMany({ where });
      await tx.workSource.deleteMany({ where });
      await tx.savingsGoal.deleteMany({ where });
      await tx.financialAccountBalanceSnapshot.deleteMany({ where });
      await tx.financialAccount.deleteMany({ where });
      await tx.expenseCategory.deleteMany({ where });
      await tx.counterparty.deleteMany({ where });
      await tx.engineeringProject.deleteMany({ where });
      await tx.technology.deleteMany({ where });
      await tx.user.delete({ where: { id, email } });
    },
    { timeout: 15000 },
  );
  for (const file of media) {
    await getMediaStorage().remove(file.storageKey);
    if (file.previewStorageKey)
      await getMediaStorage().remove(file.previewStorageKey);
  }
  for (const job of jobs)
    if (job.storageKey) {
      await getMediaStorage().remove(job.storageKey);
      await getMediaStorage().remove(
        job.storageKey.replace(/\.webp$/, "-preview.webp"),
      );
    }
}
