import { toSessionDetailItem } from "@/features/sessions/mappers/session.mapper";
import { validateSessionEndCorrection } from "@/features/sessions/timing/utils/session-end-correction.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

/** Correct a completed timer without changing its start or recorded breaks. */
export async function correctSessionEnd(
  userId: string,
  sessionId: string,
  endedAt: Date,
  expectedEndedAt: Date,
) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, endedAt: { not: null } },
    select: { startedAt: true, endedAt: true },
  });
  if (!session || !session.endedAt) return { status: "not-found" } as const;
  const invalid = validateSessionEndCorrection(
    session.startedAt,
    session.endedAt,
    expectedEndedAt,
    endedAt,
  );
  if (invalid) return { status: invalid } as const;

  const updated = await prisma.session.updateMany({
    where: { id: sessionId, userId, endedAt: expectedEndedAt },
    data: { endedAt },
  });
  if (updated.count !== 1) return { status: "conflict" } as const;

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
