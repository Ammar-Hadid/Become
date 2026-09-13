import type { Prisma } from "@/generated/prisma/client";

export async function lockTimer(tx: Prisma.TransactionClient, userId: string) {
  // NO KEY UPDATE serializes timer changes without blocking unrelated FK inserts.
  await tx.$queryRaw`SELECT id FROM "user" WHERE id=${userId} FOR NO KEY UPDATE`;
}

export async function advanceTimerRevision(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.user.update({
    where: { id: userId },
    data: { timerRevision: { increment: 1 } },
  });
}

export async function timerNow(tx: Prisma.TransactionClient) {
  // Read after acquiring the lock: transaction-start time can predate another transition.
  const [row] = await tx.$queryRaw<
    { now: Date }[]
  >`SELECT (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3) AS now`;
  return row.now;
}
