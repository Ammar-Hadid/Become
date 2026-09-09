import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { counterpartyNameSchema } from "@/features/finance/counterparties/schemas/counterparty.schema";
import { normalizeCounterpartyName } from "@/features/finance/counterparties/utils/counterparty.util";
import { FinanceError } from "@/features/finance/types/finance.types";

export async function resolveCounterpartyId(
  tx: Prisma.TransactionClient,
  userId: string,
  input: { id?: string | null; name?: string | null },
) {
  if (input.id) {
    const counterparty = await tx.counterparty.findFirst({
      where: { id: input.id, userId },
      select: { id: true },
    });
    if (!counterparty) throw new FinanceError("Counterparty is unavailable.");
    return counterparty.id;
  }
  if (!input.name) return null;

  const name = counterpartyNameSchema.parse(input.name);
  const normalizedName = normalizeCounterpartyName(name);
  const counterparty = await tx.counterparty.upsert({
    where: { userId_normalizedName: { userId, normalizedName } },
    create: { userId, name, normalizedName },
    update: { archivedAt: null },
    select: { id: true },
  });
  return counterparty.id;
}

export async function saveCounterparty(
  userId: string,
  input: { id?: string | null; name: unknown },
) {
  const name = counterpartyNameSchema.parse(input.name);
  const normalizedName = normalizeCounterpartyName(name);
  if (input.id) {
    return prisma.counterparty.update({
      where: { id: input.id, userId },
      data: { name, normalizedName },
      select: { id: true },
    });
  }
  return prisma.counterparty.upsert({
    where: { userId_normalizedName: { userId, normalizedName } },
    create: { userId, name, normalizedName },
    update: { archivedAt: null },
    select: { id: true },
  });
}

export async function archiveCounterparty(userId: string, id: string) {
  await prisma.counterparty.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
}
