import { DateTime } from "luxon";
import type { EngineeringEvidenceInput } from "@/features/engineering/schemas/engineering.schema";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function createEngineeringEvidence(
  userId: string,
  input: EngineeringEvidenceInput,
) {
  const links = await resolveEvidenceLinks(userId, input);
  if (!links) return { status: "invalid-links" } as const;

  const evidence = await prisma.engineeringEvidence.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      details: input.details,
      occurredAt: toOccurredAt(input.occurredAt),
      projectId: links.projectId,
      sessionId: links.sessionId,
    },
    select: { id: true },
  });
  return { status: "created", evidenceId: evidence.id } as const;
}

export async function updateEngineeringEvidence(
  userId: string,
  evidenceId: string,
  input: EngineeringEvidenceInput,
) {
  const existing = await prisma.engineeringEvidence.findFirst({
    where: { id: evidenceId, userId },
    select: { id: true },
  });
  if (!existing) return { status: "not-found" } as const;

  const links = await resolveEvidenceLinks(userId, input);
  if (!links) return { status: "invalid-links" } as const;

  await prisma.engineeringEvidence.update({
    where: { id: existing.id },
    data: {
      type: input.type,
      title: input.title,
      details: input.details,
      occurredAt: toOccurredAt(input.occurredAt),
      projectId: links.projectId,
      sessionId: links.sessionId,
    },
  });
  return { status: "updated" } as const;
}

export async function deleteEngineeringEvidence(
  userId: string,
  evidenceId: string,
) {
  const result = await prisma.engineeringEvidence.deleteMany({
    where: { id: evidenceId, userId },
  });
  return result.count > 0;
}

async function resolveEvidenceLinks(
  userId: string,
  input: Pick<EngineeringEvidenceInput, "projectId" | "sessionId">,
) {
  const [project, session] = await Promise.all([
    input.projectId
      ? prisma.engineeringProject.findFirst({
          where: { id: input.projectId, userId },
          select: { id: true },
        })
      : null,
    input.sessionId
      ? prisma.session.findFirst({
          where: {
            id: input.sessionId,
            userId,
            domain: { slug: "engineering" },
          },
          select: { id: true, engineeringProjectId: true },
        })
      : null,
  ]);

  if (input.projectId && !project) return null;
  if (input.sessionId && !session) return null;
  if (
    project &&
    session?.engineeringProjectId &&
    project.id !== session.engineeringProjectId
  ) {
    return null;
  }

  return {
    sessionId: session?.id ?? null,
    projectId: session?.engineeringProjectId ? null : (project?.id ?? null),
  };
}

function toOccurredAt(value: string) {
  return DateTime.fromISO(value, { zone: APP_TIMEZONE }).toUTC().toJSDate();
}
