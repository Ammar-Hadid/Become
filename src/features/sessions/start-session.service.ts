import { Prisma } from "@/generated/prisma/client";
import type { StartSessionInput } from "@/features/sessions/session.schema";
import { prisma } from "@/lib/db/prisma.adapter";

export async function startSession(userId: string, input: StartSessionInput) {
  const activity = await prisma.activityType.findFirst({
    where: {
      id: input.activityTypeId,
      domainId: input.domainId,
      enabled: true,
      domain: { userId, enabled: true },
    },
  });

  if (!activity) return { status: "activity-not-found" } as const;

  try {
    const session = await prisma.session.create({
      data: {
        userId,
        domainId: input.domainId,
        activityTypeId: input.activityTypeId,
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
