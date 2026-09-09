import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Prisma } from "@/generated/prisma/client";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";

export async function captureOnce(
  userId: string,
  key: string,
  payload: unknown,
  run: (tx: Prisma.TransactionClient) => Promise<string>,
) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new BusinessError("Reopen this form before saving.");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`business-graph:${userId}`}, 0))::text`;
    // Serialize identical submissions, including a retry after a lost response.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + key}, 0))::text`;
    const prior = await tx.businessCapture.findUnique({ where: { id: key } });
    if (prior) {
      if (prior.userId !== userId || prior.fingerprint !== fingerprint)
        throw new BusinessError(
          "This submission was already saved with different entries. Reopen the form for a new record.",
        );
      return { id: prior.resultId };
    }
    const id = await run(tx);
    await tx.businessCapture.create({
      data: { id: key, userId, fingerprint, resultId: id },
    });
    return { id };
  });
}
