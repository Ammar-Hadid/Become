import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getStatementImports(userId: string, accountId: string) {
  return prisma.financialStatementImport.findMany({
    where: { userId, accountId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
export async function getStatementPreview(userId: string, importId: string) {
  const batch = await prisma.financialStatementImport.findFirst({
    where: { id: importId, userId },
    include: {
      account: true,
      observations: {
        where: { link: { status: { not: "IGNORED" } } },
        include: { link: true },
        orderBy: [{ activityOn: "asc" }, { id: "asc" }],
        take: 5001,
      },
    },
  });
  if (!batch) return null;
  const ids = [
    ...new Set(
      batch.observations.flatMap((x) => x.link?.duplicateCandidates ?? []),
    ),
  ];
  const candidates = ids.length
    ? await prisma.financialTransaction.findMany({
        where: { userId, id: { in: ids } },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          occurredAt: true,
          type: true,
          notes: true,
          account: { select: { name: true } },
        },
        take: 100,
      })
    : [];
  return {
    ...batch,
    rows: batch.observations,
    errors: z
      .array(z.object({ line: z.number(), message: z.string() }))
      .parse(batch.errors),
    candidates,
  };
}
