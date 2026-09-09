import type { FinanceActivityKind, Prisma } from "@/generated/prisma/client";
import type { StartSessionInput } from "@/features/sessions/schemas/session.schema";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function financeSessionValues(
  userId: string,
  kind: FinanceActivityKind | null,
  input: Pick<
    StartSessionInput,
    "workSourceId" | "incomeOpportunityId" | "financeCompensationType"
  >,
  tx: Prisma.TransactionClient = prisma,
) {
  if (
    input.workSourceId &&
    !(await tx.workSource.findFirst({
      where: { id: input.workSourceId, userId, archivedAt: null },
    }))
  )
    throw new FinanceError("Work source is unavailable.");
  if (
    input.incomeOpportunityId &&
    !(await tx.incomeOpportunity.findFirst({
      where: { id: input.incomeOpportunityId, userId, archivedAt: null },
    }))
  )
    throw new FinanceError("Opportunity is unavailable.");
  if (
    (!kind || kind === "FINANCE_ADMIN") &&
    (input.workSourceId ||
      input.incomeOpportunityId ||
      input.financeCompensationType)
  )
    throw new FinanceError(
      "This activity does not accept income-development metadata.",
    );
  if (
    kind !== "PAID_WORK" &&
    (input.workSourceId || input.financeCompensationType)
  )
    throw new FinanceError("Work source and compensation require Paid Work.");
  return {
    financeActivityKind: kind,
    workSourceId: input.workSourceId || null,
    incomeOpportunityId: input.incomeOpportunityId || null,
    financeCompensationType:
      kind === "PAID_WORK"
        ? (input.financeCompensationType ?? "UNKNOWN")
        : null,
  };
}
