import type { Prisma } from "@/generated/prisma/client";
import type {
  EngineeringEvidenceListItem,
  EngineeringProjectDetail,
  EngineeringProjectListItem,
  EngineeringTechnologyOption,
} from "@/features/engineering/types/engineering.types";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

type ProjectScope = "open" | "completed" | "archived" | "all";

const evidenceInclude = {
  project: { select: { id: true, name: true } },
  session: {
    select: {
      id: true,
      description: true,
      engineeringProject: { select: { id: true, name: true } },
      activityType: { select: { name: true } },
    },
  },
} satisfies Prisma.EngineeringEvidenceInclude;

type EvidenceWithRelations = Prisma.EngineeringEvidenceGetPayload<{
  include: typeof evidenceInclude;
}>;

const technologySelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  iconKey: true,
  isBuiltIn: true,
} satisfies Prisma.TechnologySelect;

type TechnologyRecord = Prisma.TechnologyGetPayload<{
  select: typeof technologySelect;
}>;

export async function getEngineeringTechnologyCatalog(userId: string) {
  const technologies = await prisma.technology.findMany({
    where: { OR: [{ isBuiltIn: true, userId: null }, { userId }] },
    select: technologySelect,
    orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
  });
  return technologies.map(mapTechnology);
}

export async function getEngineeringProjectOptions(userId: string) {
  return prisma.engineeringProject.findMany({
    where: { userId, status: "ACTIVE", archivedAt: null },
    select: { id: true, name: true, context: true },
    orderBy: { name: "asc" },
  });
}

export async function getEngineeringProjects(
  userId: string,
  scope: ProjectScope = "open",
): Promise<EngineeringProjectListItem[]> {
  const where: Prisma.EngineeringProjectWhereInput = {
    userId,
    ...(scope === "archived"
      ? { archivedAt: { not: null } }
      : scope === "completed"
        ? { archivedAt: null, status: "COMPLETED" }
        : scope === "open"
          ? { archivedAt: null, status: { not: "COMPLETED" } }
          : {}),
  };
  const projects = await prisma.engineeringProject.findMany({
    where,
    include: {
      _count: { select: { sessions: true } },
      technologies: {
        select: { technology: { select: technologySelect } },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project.id);
  const evidence = await prisma.engineeringEvidence.findMany({
    where: {
      userId,
      OR: [
        { projectId: { in: projectIds } },
        { session: { is: { engineeringProjectId: { in: projectIds } } } },
      ],
    },
    select: {
      projectId: true,
      session: { select: { engineeringProjectId: true } },
    },
  });
  const evidenceCounts = new Map<string, number>();
  for (const item of evidence) {
    const projectId = item.projectId ?? item.session?.engineeringProjectId;
    if (projectId) {
      evidenceCounts.set(projectId, (evidenceCounts.get(projectId) ?? 0) + 1);
    }
  }

  return projects.map((project) =>
    mapProject(
      project,
      project._count.sessions,
      evidenceCounts.get(project.id) ?? 0,
      project.technologies.map((link) => link.technology),
    ),
  );
}

export async function getEngineeringProjectById(
  userId: string,
  projectId: string,
): Promise<EngineeringProjectDetail | null> {
  const project = await prisma.engineeringProject.findFirst({
    where: { id: projectId, userId },
    include: {
      _count: { select: { sessions: true } },
      technologies: {
        select: { technology: { select: technologySelect } },
      },
    },
  });
  if (!project) return null;

  const [sessions, sessionDurations, evidence, evidenceCount] =
    await Promise.all([
      prisma.session.findMany({
        where: { userId, engineeringProjectId: projectId },
        include: {
          domain: true,
          activityType: true,
          engineeringProject: true,
        },
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
      prisma.session.findMany({
        where: { userId, engineeringProjectId: projectId },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.engineeringEvidence.findMany({
        where: {
          userId,
          OR: [
            { projectId },
            { session: { is: { engineeringProjectId: projectId } } },
          ],
        },
        include: evidenceInclude,
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
      prisma.engineeringEvidence.count({
        where: {
          userId,
          OR: [
            { projectId },
            { session: { is: { engineeringProjectId: projectId } } },
          ],
        },
      }),
    ]);

  const now = Date.now();
  const totalSeconds = sessionDurations.reduce(
    (total, session) =>
      total +
      Math.max(
        0,
        Math.floor(
          ((session.endedAt?.getTime() ?? now) - session.startedAt.getTime()) /
            1000,
        ),
      ),
    0,
  );

  return {
    ...mapProject(
      project,
      project._count.sessions,
      evidenceCount,
      project.technologies.map((link) => link.technology),
    ),
    notes: project.notes,
    totalSeconds,
    sessions: sessions.map((session) => toSessionListItem(session)),
    evidence: evidence.map(mapEvidence),
  };
}

export async function getEngineeringEvidenceById(
  userId: string,
  evidenceId: string,
) {
  const evidence = await prisma.engineeringEvidence.findFirst({
    where: { id: evidenceId, userId },
    include: evidenceInclude,
  });
  return evidence ? mapEvidence(evidence) : null;
}

export async function getEngineeringEvidenceList(userId: string, take = 100) {
  const evidence = await prisma.engineeringEvidence.findMany({
    where: { userId },
    include: evidenceInclude,
    orderBy: { occurredAt: "desc" },
    take,
  });
  return evidence.map(mapEvidence);
}

export async function getEngineeringEvidenceFormOptions(userId: string) {
  const [projects, sessions] = await Promise.all([
    prisma.engineeringProject.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { userId, domain: { slug: "engineering" } },
      select: {
        id: true,
        description: true,
        startedAt: true,
        activityType: { select: { name: true } },
        engineeringProject: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    projects,
    sessions: sessions.map((session) => ({
      id: session.id,
      label: session.description || session.activityType.name,
      startedAt: session.startedAt.toISOString(),
      project: session.engineeringProject,
    })),
  };
}

function mapProject(
  project: {
    id: string;
    name: string;
    description: string | null;
    context: EngineeringProjectListItem["context"];
    status: EngineeringProjectListItem["status"];
    repositoryUrl: string | null;
    liveUrl: string | null;
    startedOn: Date | null;
    completedOn: Date | null;
    archivedAt: Date | null;
  },
  sessionCount: number,
  evidenceCount: number,
  technologies: TechnologyRecord[],
): EngineeringProjectListItem {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    context: project.context,
    status: project.status,
    repositoryUrl: project.repositoryUrl,
    liveUrl: project.liveUrl,
    startedOn: project.startedOn?.toISOString().slice(0, 10) ?? null,
    completedOn: project.completedOn?.toISOString().slice(0, 10) ?? null,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    sessionCount,
    evidenceCount,
    technologies: technologies
      .map(mapTechnology)
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function mapTechnology(
  technology: TechnologyRecord,
): EngineeringTechnologyOption {
  return technology;
}

function mapEvidence(
  evidence: EvidenceWithRelations,
): EngineeringEvidenceListItem {
  return {
    id: evidence.id,
    type: evidence.type,
    title: evidence.title,
    details: evidence.details,
    occurredAt: evidence.occurredAt.toISOString(),
    project: evidence.project ?? evidence.session?.engineeringProject ?? null,
    session: evidence.session
      ? {
          id: evidence.session.id,
          description: evidence.session.description,
          activityName: evidence.session.activityType.name,
        }
      : null,
  };
}
