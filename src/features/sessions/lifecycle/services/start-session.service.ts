import { Prisma } from "@/generated/prisma/client";
import type { StartSessionInput } from "@/features/sessions/schemas/session.schema";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { financeSessionValues } from "@/features/finance/sessions/services/finance-session.service";

export async function startSession(userId: string, input: StartSessionInput) {
  const activity = await prisma.activityType.findFirst({
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
    const project = await prisma.engineeringProject.findFirst({
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

  try {
    const session = await prisma.session.create({
      data: {
        userId,
        ...finance,
        domainId: input.domainId,
        activityTypeId: input.activityTypeId,
        engineeringContext: isEngineering ? input.engineeringContext : null,
        engineeringProjectId: isEngineering ? input.engineeringProjectId : null,
        description: input.description,
        startedAt: new Date(),
      },
    });
    return { status: "created", sessionId: session.id } as const;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "already-active" } as const;
    }
    throw error;
  }
}
