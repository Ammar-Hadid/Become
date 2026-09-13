import {
  lockTimer,
  advanceTimerRevision,
  timerNow,
} from "./timer-mutation.service";
import {
  readTimerSnapshot,
  timerSessionInclude,
} from "@/features/sessions/timer/queries/timer-snapshot.query";
import { lockDirection } from "@/features/direction/services/direction-mutation.service";
import { contentSessionValues } from "@/features/content/sessions/services/content-session.service";
import { businessSessionValues } from "@/features/entrepreneurship/sessions/services/business-session.service";
import type { StartSessionInput } from "@/features/sessions/schemas/session.schema";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";
import { financeSessionValues } from "@/features/finance/sessions/services/finance-session.service";

export async function startSession(userId: string, input: StartSessionInput) {
  return prisma.$transaction(async (tx) => {
    await lockTimer(tx, userId);
    const current = await readTimerSnapshot(tx, userId);
    if (current.activeSession)
      return { status: "already-active", timer: current } as const;
    const activity = await tx.activityType.findFirst({
      where: {
        id: input.activityTypeId,
        domainId: input.domainId,
        enabled: true,
        domain: { userId, enabled: true },
      },
      include: { domain: true },
    });

    if (!activity) return { status: "activity-not-found" } as const;
    const finance = await financeSessionValues(
      userId,
      activity.domain.slug === "finance" ? activity.financeActivityKind : null,
      input,
      tx,
    );

    const business = await businessSessionValues(
      userId,
      activity.domain.slug === "entrepreneurship",
      activity.slug,
      input,
      tx,
    );
    if (input.contentId)
      await lockDirection(tx, userId, `content:${input.contentId}`);
    const content = await contentSessionValues(
      userId,
      activity.domain.slug,
      activity.name,
      input,
      tx,
    );
    const isEngineering = activity.domain.slug === "engineering";
    if (isEngineering && !input.engineeringContext) {
      return { status: "engineering-context-required" } as const;
    }
    if (
      !isEngineering &&
      (input.engineeringContext || input.engineeringProjectId)
    ) {
      return { status: "invalid-engineering-details" } as const;
    }

    if (input.engineeringProjectId) {
      const project = await tx.engineeringProject.findFirst({
        where: {
          id: input.engineeringProjectId,
          userId,
          status: "ACTIVE",
          archivedAt: null,
        },
        select: { id: true },
      });
      if (!project) return { status: "project-not-found" } as const;
    }

    const data = {
      userId,
      ...finance,
      ...business,
      ...content,
      domainId: input.domainId,
      activityTypeId: input.activityTypeId,
      engineeringContext: isEngineering ? input.engineeringContext : null,
      engineeringProjectId: isEngineering ? input.engineeringProjectId : null,
      description: input.description,
      startedAt: await timerNow(tx),
    };
    const session = await tx.session.create({
      data,
      include: timerSessionInclude,
    });
    await advanceTimerRevision(tx, userId);
    return {
      status: "created",
      sessionId: session.id,
      session: toSessionListItem(session),
      timer: await readTimerSnapshot(tx, userId),
    } as const;
  });
}
