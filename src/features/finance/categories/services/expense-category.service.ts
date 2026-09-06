import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { financeName } from "@/features/finance/schemas/finance.schema";
import { normalizeReusableEntityName } from "@/features/finance/entities/utils/reusable-entity.util";

export async function saveExpenseCategory(
  userId: string,
  input: { id?: string | null; name: unknown },
) {
  const name = financeName.parse(input.name);
  const normalizedName = normalizeReusableEntityName(name);
  if (input.id) {
    return prisma.expenseCategory.update({
      where: { id: input.id, userId },
      data: { name, normalizedName },
      select: { id: true },
    });
  }
  return prisma.expenseCategory.upsert({
    where: { userId_normalizedName: { userId, normalizedName } },
    create: { userId, name, normalizedName },
    update: { archivedAt: null },
    select: { id: true },
  });
}

export async function archiveExpenseCategory(userId: string, id: string) {
  await prisma.expenseCategory.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
}
