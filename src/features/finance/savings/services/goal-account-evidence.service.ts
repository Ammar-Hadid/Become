import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function linkSavingsGoalAccount(
  userId: string,
  id: string,
  accountId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const goal = await tx.savingsGoal.findFirst({
      where: { id, userId, archivedAt: null },
    });
    if (!goal) throw new FinanceError("Goal is unavailable.");
    if (
      accountId &&
      !(await tx.financialAccount.findFirst({
        where: {
          id: accountId,
          userId,
          archivedAt: null,
          currency: goal.currency,
          type: { not: "CREDIT_CARD" },
        },
      }))
    )
      throw new FinanceError(
        "Choose an owned active asset account in the goal currency.",
      );
    await tx.savingsGoal.update({ where: { id, userId }, data: { accountId } });
    return { id };
  });
}
