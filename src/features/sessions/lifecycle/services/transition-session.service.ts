import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  lockTimer,
  advanceTimerRevision,
  timerNow,
} from "./timer-mutation.service";
import { readTimerSnapshot } from "@/features/sessions/timer/queries/timer-snapshot.query";

export async function transitionSession(
  userId: string,
  sessionId: string,
  action: "pause" | "resume",
  expectedRevision: number,
) {
  return prisma.$transaction(async (tx) => {
    await lockTimer(tx, userId);
    const timer = await readTimerSnapshot(tx, userId);
    const target = await tx.session.findFirst({
      where: { id: sessionId, userId },
      select: { endedAt: true },
    });
    if (!target) return { status: "not-found", timer } as const;
    if (target.endedAt || timer.activeSession?.id !== sessionId) {
      return {
        status: "conflict",
        error: "This session has already ended.",
        timer,
      } as const;
    }
    const desired = action === "pause" ? "PAUSED" : "RUNNING";
    // A lost acknowledgement can be retried without opening or closing another interval.
    if (timer.activeSession.status === desired) {
      return { status: "ok", session: timer.activeSession, timer } as const;
    }
    if (timer.revision !== expectedRevision) {
      return {
        status: "conflict",
        error: "Your session changed. Review its current state and try again.",
        timer,
      } as const;
    }
    const now = await timerNow(tx);
    if (action === "pause") {
      await tx.sessionPause.create({ data: { sessionId, startedAt: now } });
    } else {
      await tx.sessionPause.updateMany({
        where: { sessionId, endedAt: null },
        data: { endedAt: now },
      });
    }
    await advanceTimerRevision(tx, userId);
    const updated = await readTimerSnapshot(tx, userId);
    return {
      status: "ok",
      session: updated.activeSession!,
      timer: updated,
    } as const;
  });
}
