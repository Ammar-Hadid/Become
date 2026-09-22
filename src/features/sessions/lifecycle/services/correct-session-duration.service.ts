import { toSessionDetailItem } from "@/features/sessions/mappers/session.mapper";
import { resolveSessionEndForDuration } from "@/features/sessions/timing/utils/session-end-correction.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

/** Correct focused duration without changing the start or recorded breaks. */
export async function correctSessionDuration(
  userId: string,
  sessionId: string,
  durationSeconds: number,
  expectedEndedAt: Date,
) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, endedAt: { not: null } },
    select: { startedAt: true, endedAt: true, pauses: true },
  });
  if (!session || !session.endedAt) return { status: "not-found" } as const;
  const correctedEnd = resolveSessionEndForDuration(
    { ...session, endedAt: session.endedAt },
    expectedEndedAt,
    durationSeconds,
  );
  if (typeof correctedEnd === "string")
    return { status: correctedEnd } as const;

  if (correctedEnd.getTime() !== session.endedAt.getTime()) {
    const updated = await prisma.session.updateMany({
      where: { id: sessionId, userId, endedAt: expectedEndedAt },
      data: { endedAt: correctedEnd },
    });
    if (updated.count !== 1) return { status: "conflict" } as const;
  }

  const corrected = await prisma.session.findFirstOrThrow({
    where: { id: sessionId, userId },
    include: {
      domain: true,
      activityType: true,
      engineeringProject: true,
      pauses: true,
      engineeringEvidence: { orderBy: { occurredAt: "desc" } },
    },
  });
  return { status: "ok", session: toSessionDetailItem(corrected) } as const;
}
