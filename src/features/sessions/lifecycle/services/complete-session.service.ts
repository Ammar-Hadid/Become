import type { CompleteSessionInput } from "@/features/sessions/schemas/session.schema";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function completeSession(
  userId: string,
  sessionId: string,
  input: CompleteSessionInput,
) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.session.findFirst({
      where: { id: sessionId, userId, endedAt: null },
      include: { domain: true },
    });
    if (!session) return { status: "not-found" } as const;

    const isEngineering = session.domain.slug === "engineering";
    const hasEngineeringInput =
      input.engineeringContext !== undefined ||
      input.engineeringProjectId !== undefined ||
      Boolean(input.engineeringEvidence);
    if (!isEngineering && hasEngineeringInput) {
      return { status: "invalid-engineering-details" } as const;
    }

    const engineeringContext =
      input.engineeringContext === undefined
        ? session.engineeringContext
        : input.engineeringContext;
    if (isEngineering && !engineeringContext) {
      return { status: "engineering-context-required" } as const;
    }

    const engineeringProjectId =
      input.engineeringProjectId === undefined
        ? session.engineeringProjectId
        : input.engineeringProjectId;

    if (isEngineering && engineeringProjectId) {
      const project = await transaction.engineeringProject.findFirst({
        where: { id: engineeringProjectId, userId },
        select: { id: true },
      });
      if (!project) return { status: "project-not-found" } as const;
    }

    const result = await transaction.session.updateMany({
      where: { id: sessionId, userId, endedAt: null },
      data: {
        endedAt: new Date(),
        outcome: input.outcome,
        notes: input.notes,
        engineeringContext: isEngineering ? engineeringContext : null,
        engineeringProjectId: isEngineering ? engineeringProjectId : null,
      },
    });
    if (result.count === 0) return { status: "not-found" } as const;

    if (isEngineering && input.engineeringEvidence) {
      await transaction.engineeringEvidence.create({
        data: {
          userId,
          sessionId,
          type: input.engineeringEvidence.type,
          title: input.engineeringEvidence.title,
          details: input.engineeringEvidence.details,
          occurredAt: new Date(),
        },
      });
    }

    return { status: "completed" } as const;
  });
}
