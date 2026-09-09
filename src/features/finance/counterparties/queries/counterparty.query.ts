import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function getCounterpartyOptions(userId: string) {
  return prisma.counterparty.findMany({
    where: { userId, archivedAt: null },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function getCounterpartiesForManagement(userId: string) {
  return prisma.counterparty.findMany({
    where: { userId },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}
