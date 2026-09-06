import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getFinanceWorkOptions(userId: string) {
  const [workSources, opportunities] = await Promise.all([
    prisma.workSource.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, name: true, defaultCompensationType: true },
      orderBy: { name: "asc" },
    }),
    prisma.incomeOpportunity.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, title: true, resultingWorkSourceId: true },
      orderBy: [{ discoveredAt: "desc" }, { id: "asc" }],
    }),
  ]);
  return { workSources, opportunities };
}
