import type { Prisma } from "@/generated/prisma/client";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function lockFinancialTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM financial_transaction WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
  if (!rows.length) throw new FinanceError("Transaction not found.");
}
