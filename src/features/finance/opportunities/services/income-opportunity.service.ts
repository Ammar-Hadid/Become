import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { opportunitySchema } from "@/features/finance/opportunities/schemas/income-opportunity.schema";
import { workSourceSchema } from "@/features/finance/work-sources/schemas/work-source.schema";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function saveIncomeOpportunity(
  userId: string,
  input: unknown,
  id?: string,
) {
  const { expectedAmount, ...data } = opportunitySchema.parse(input);
  void expectedAmount;
  return id
    ? prisma.incomeOpportunity.update({
        where: { id, userId, archivedAt: null },
        data,
      })
    : prisma.incomeOpportunity.create({ data: { ...data, userId } });
}
export async function continueAcceptedOpportunity(
  userId: string,
  opportunityId: string,
  choice: "create" | "link",
  source: unknown,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM income_opportunity WHERE id = ${opportunityId} AND "userId" = ${userId} FOR UPDATE`;
    const opportunity = await tx.incomeOpportunity.findFirst({
      where: {
        id: opportunityId,
        userId,
        status: "ACCEPTED",
        archivedAt: null,
      },
    });
    if (!opportunity)
      throw new FinanceError("Save this opportunity as accepted first.");
    if (opportunity.resultingWorkSourceId)
      throw new FinanceError(
        "This accepted opportunity already has a work source.",
      );
    const workSource =
      choice === "create"
        ? await tx.workSource.create({
            data: { ...workSourceSchema.parse(source), userId },
          })
        : await tx.workSource.findFirst({
            where: { id: String(source), userId, archivedAt: null },
          });
    if (!workSource) throw new FinanceError("Choose an active work source.");
    await tx.incomeOpportunity.update({
      where: { id: opportunityId, userId },
      data: { resultingWorkSourceId: workSource.id },
    });
    return { id: workSource.id };
  });
}
export async function archiveIncomeOpportunity(userId: string, id: string) {
  await prisma.incomeOpportunity.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
}
