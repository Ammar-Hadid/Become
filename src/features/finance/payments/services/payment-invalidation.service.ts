import { Prisma } from "@/generated/prisma/client";
export async function invalidatePaymentAttribution(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
) {
  const allocations = await tx.paymentSessionAllocation.findMany({
    where: { userId, transactionId },
    select: { sessionId: true },
  });
  const ids = allocations.map((allocation) => allocation.sessionId).sort();
  if (!ids.length) return;
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM session WHERE "userId" = ${userId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
  );
  await tx.session.updateMany({
    where: { userId, id: { in: ids } },
    data: { paymentAttributionCompleteAt: null },
  });
}
