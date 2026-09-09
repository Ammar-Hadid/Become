import { businessSessionValues } from "@/features/entrepreneurship/sessions/services/business-session.service";
import type { CompleteSessionInput } from "@/features/sessions/schemas/session.schema";
import { toSessionDetailItem } from "@/features/sessions/mappers/session.mapper";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function completeSession(
  userId: string,
  sessionId: string,
  input: CompleteSessionInput,
) {
  return prisma.$transaction(async (transaction) => {
    const include = {
      domain: true,
      activityType: true,
      engineeringProject: true,
      engineeringEvidence: { orderBy: { occurredAt: "desc" } },
    } as const;
    const session = await transaction.session.findFirst({
      where: { id: sessionId, userId },
      include,
    });
    if (!session) return { status: "not-found" } as const;
    // A retry must return the original completion, including its end time.
    if (session.endedAt) {
      return {
        status: "completed",
        sessionId,
        evidenceId: null,
        session: toSessionDetailItem(session),
      } as const;
    }

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

    const business = input.businessCompanyId !== undefined || input.businessNicheId !== undefined
      ? await businessSessionValues(userId, session.domain.slug === "entrepreneurship", session.activityType.slug, { businessCompanyId: input.businessCompanyId === undefined ? session.businessCompanyId : input.businessCompanyId, businessNicheId: input.businessNicheId === undefined ? session.businessNicheId : input.businessNicheId }, transaction) : {};
    const result = await transaction.session.updateMany({
      where: { id: sessionId, userId, endedAt: null },
      data: {
        ...business,
        // Completing old recovered timers must not reinterpret their activity.
        entrepreneurshipActivityKind: session.entrepreneurshipActivityKind,
        endedAt: new Date(),
        outcome: input.outcome,
        notes: input.notes,
        engineeringContext: isEngineering ? engineeringContext : null,
        engineeringProjectId: isEngineering ? engineeringProjectId : null,
      },
    });
    let evidenceId: string | null = null;
    if (result.count > 0 && isEngineering && input.engineeringEvidence) {
      const evidence = await transaction.engineeringEvidence.create({
        data: {
          userId,
          sessionId,
          type: input.engineeringEvidence.type,
          title: input.engineeringEvidence.title,
          details: input.engineeringEvidence.details,
          occurredAt: new Date(),
        },
        select: { id: true },
      });
      evidenceId = evidence.id;
    }

    const completed = await transaction.session.findFirstOrThrow({
      where: { id: sessionId, userId, endedAt: { not: null } },
      include,
    });
    return {
      status: "completed",
      sessionId,
      evidenceId,
      session: toSessionDetailItem(completed),
    } as const;
  });
}
