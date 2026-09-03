import type { CompleteSessionInput } from "@/features/sessions/session.schema";
import { prisma } from "@/lib/db/prisma.adapter";

export async function completeSession(
  userId: string,
  sessionId: string,
  input: CompleteSessionInput,
) {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, endedAt: null },
    data: {
      endedAt: new Date(),
      outcome: input.outcome,
      notes: input.notes,
    },
  });

  return result.count > 0;
}
