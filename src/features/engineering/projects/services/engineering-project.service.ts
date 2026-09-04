import { DateTime } from "luxon";
import type { Prisma } from "@/generated/prisma/client";
import type { EngineeringProjectInput } from "@/features/engineering/schemas/engineering.schema";
import { toTechnologySlug } from "@/features/engineering/technologies/utils/engineering-technology.util";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export async function createEngineeringProject(
  userId: string,
  input: EngineeringProjectInput,
) {
  return prisma.$transaction(async (transaction) => {
    const technologyIds = await resolveProjectTechnologyIds(
      transaction,
      userId,
      input,
    );
    if (!technologyIds) return { status: "invalid-technologies" } as const;

    const project = await transaction.engineeringProject.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        context: input.context,
        status: input.status,
        repositoryUrl: input.repositoryUrl,
        liveUrl: input.liveUrl,
        notes: input.notes,
        ...normalizeProjectDates(input),
        technologies: {
          create: technologyIds.map((technologyId) => ({ technologyId })),
        },
      },
      select: { id: true },
    });
    return { status: "created", projectId: project.id } as const;
  });
}

export async function updateEngineeringProject(
  userId: string,
  projectId: string,
  input: EngineeringProjectInput,
) {
  return prisma.$transaction(async (transaction) => {
    const project = await transaction.engineeringProject.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return { status: "not-found" } as const;

    const technologyIds = await resolveProjectTechnologyIds(
      transaction,
      userId,
      input,
    );
    if (!technologyIds) return { status: "invalid-technologies" } as const;

    await transaction.engineeringProject.update({
      where: { id: project.id },
      data: {
        name: input.name,
        description: input.description,
        context: input.context,
        status: input.status,
        repositoryUrl: input.repositoryUrl,
        liveUrl: input.liveUrl,
        notes: input.notes,
        ...normalizeProjectDates(input),
        technologies: {
          deleteMany: {},
          create: technologyIds.map((technologyId) => ({ technologyId })),
        },
      },
    });
    return { status: "updated" } as const;
  });
}

export async function setEngineeringProjectArchived(
  userId: string,
  projectId: string,
  archived: boolean,
) {
  const result = await prisma.engineeringProject.updateMany({
    where: { id: projectId, userId },
    data: { archivedAt: archived ? new Date() : null },
  });
  return result.count > 0;
}

function normalizeProjectDates(input: EngineeringProjectInput) {
  const today = DateTime.now().setZone(APP_TIMEZONE).toISODate();
  const startedOnValue =
    input.startedOn ?? (input.status === "PLANNED" ? null : today);
  const completedOnValue =
    input.status === "COMPLETED" ? (input.completedOn ?? today) : null;
  return {
    startedOn: toDatabaseDate(startedOnValue),
    completedOn: toDatabaseDate(completedOnValue),
  };
}

function toDatabaseDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function resolveProjectTechnologyIds(
  transaction: Prisma.TransactionClient,
  userId: string,
  input: Pick<
    EngineeringProjectInput,
    "technologyIds" | "customTechnologyNames"
  >,
) {
  const requestedIds = [...new Set(input.technologyIds)];
  const selected = requestedIds.length
    ? await transaction.technology.findMany({
        where: {
          id: { in: requestedIds },
          OR: [
            { isBuiltIn: true, userId: null },
            { isBuiltIn: false, userId },
          ],
        },
        select: { id: true },
      })
    : [];
  if (selected.length !== requestedIds.length) return null;

  const customBySlug = new Map<string, string>();
  for (const customName of input.customTechnologyNames) {
    const slug = toTechnologySlug(customName);
    if (slug) customBySlug.set(slug, customName.trim());
  }
  const customSlugs = [...customBySlug.keys()];
  if (customSlugs.length) {
    const existing = await transaction.technology.findMany({
      where: {
        slug: { in: customSlugs },
        OR: [
          { isBuiltIn: true, userId: null },
          { isBuiltIn: false, userId },
        ],
      },
      select: { id: true, slug: true, isBuiltIn: true },
      orderBy: { isBuiltIn: "desc" },
    });
    const existingSlugs = new Set(
      existing.map((technology) => technology.slug),
    );
    const missing = customSlugs.filter((slug) => !existingSlugs.has(slug));
    if (missing.length) {
      await transaction.technology.createMany({
        data: missing.map((slug) => ({
          userId,
          name: customBySlug.get(slug)!,
          slug,
          category: "OTHER" as const,
          iconKey: null,
          isBuiltIn: false,
        })),
        skipDuplicates: true,
      });
    }
    const resolved = await transaction.technology.findMany({
      where: {
        slug: { in: customSlugs },
        OR: [
          { isBuiltIn: true, userId: null },
          { isBuiltIn: false, userId },
        ],
      },
      select: { id: true, slug: true, isBuiltIn: true },
      orderBy: { isBuiltIn: "desc" },
    });
    for (const slug of customSlugs) {
      const technology = resolved.find((candidate) => candidate.slug === slug);
      if (!technology) return null;
      selected.push({ id: technology.id });
    }
  }

  return [...new Set(selected.map((technology) => technology.id))];
}
