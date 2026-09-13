import { DateTime } from "luxon";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";
import type { TimerSnapshot } from "@/features/sessions/types/session.types";

export const timerSessionInclude = {
  domain: true,
  activityType: true,
  engineeringProject: true,
  pauses: true,
} as const;

/** Caller must hold the timer lock or use a repeatable-read transaction. */
export async function readTimerSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  now = DateTime.utc(),
): Promise<TimerSnapshot> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timerRevision: true },
  });
  const session = await tx.session.findFirst({
    where: { userId, endedAt: null },
    include: timerSessionInclude,
  });
  return {
    revision: user.timerRevision,
    activeSession: session ? toSessionListItem(session, now) : null,
  };
}

export function getTimerSnapshot(userId: string, now = DateTime.utc()) {
  return prisma.$transaction((tx) => readTimerSnapshot(tx, userId, now), {
    isolationLevel: "RepeatableRead",
  });
}
