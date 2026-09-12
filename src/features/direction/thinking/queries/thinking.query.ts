import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { Prisma } from "@/generated/prisma/client";
import {
  decodeCursor as decodeContentCursor,
  encodeCursor as encodeContentCursor,
} from "@/lib/pagination/utils/keyset-cursor.util";
import type {
  IdeaView,
  DecisionView,
  ThinkingPage,
  ThinkingOptions,
  DecisionContext,
} from "@/features/direction/thinking/types/thinking.types";
export const ideaOutputInclude = {
  content: { select: { id: true, title: true, archivedAt: true } },
  goal: { select: { id: true, title: true, archivedAt: true } },
  experiment: { select: { id: true, title: true, archivedAt: true } },
} satisfies Prisma.IdeaOutputInclude;
const ideaInclude = {
  domains: { include: { domain: true } },
  _count: { select: { outputs: true } },
  outputs: {
    include: ideaOutputInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
  },
  history: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 },
} satisfies Prisma.IdeaInclude;
type IdeaRow = Prisma.IdeaGetPayload<{ include: typeof ideaInclude }>;
export function ideaOutputView(
  o: Prisma.IdeaOutputGetPayload<{ include: typeof ideaOutputInclude }>,
): IdeaView["outputs"][number] {
  const target = o.content ?? o.goal ?? o.experiment;
  if (!target) throw new Error("Idea output has no canonical target.");
  return {
    id: target.id,
    label: target.title,
    href: o.content
      ? `/content/${target.id}`
      : o.goal
        ? `/direction/goals/${target.id}`
        : `/direction/experiments/${target.id}`,
    archived: !!target.archivedAt,
    type: o.content ? "CONTENT" : o.goal ? "GOAL" : "EXPERIMENT",
    linkedAt: o.createdAt.toISOString(),
    kind: o.kind as "CREATED" | "LINKED",
  };
}
export function ideaChangeView(
  h: Prisma.IdeaChangeGetPayload<object>,
): IdeaView["history"][number] {
  return {
    id: h.id,
    kind: h.kind,
    createdAt: h.createdAt.toISOString(),
    snapshot: h.snapshot,
  };
}
function ideaView(i: IdeaRow): IdeaView {
  return {
    id: i.id,
    version: i.version,
    title: i.title,
    notes: i.notes,
    domainIds: i.domains.map((d) => d.domainId),
    domains: i.domains.map((d) => ({ id: d.domainId, name: d.domain.name })),
    archivedAt: i.archivedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    outputsCount: i._count.outputs,
    outputs: i.outputs.slice(0, 20).map(ideaOutputView),
    outputsNextCursor:
      i.outputs.length > 20
        ? encodeContentCursor(i.outputs[19].createdAt, i.outputs[19].id)
        : null,
    history: i.history.slice(0, 20).map(ideaChangeView),
    historyNextCursor:
      i.history.length > 20
        ? encodeContentCursor(i.history[19].createdAt, i.history[19].id)
        : null,
  };
}
export async function getIdea(
  userId: string,
  id: string,
): Promise<IdeaView | null> {
  const row = await prisma.idea.findFirst({
    where: { userId, id },
    include: ideaInclude,
  });
  return row ? ideaView(row) : null;
}
export async function getIdeas(
  userId: string,
  options: {
    q?: string;
    cursor?: string;
    archived?: boolean;
    domainId?: string;
  } = {},
): Promise<ThinkingPage<IdeaView>> {
  const cursor = decodeContentCursor(options.cursor),
    q = (options.q ?? "").trim().slice(0, 200);
  const rows = await prisma.idea.findMany({
    where: {
      userId,
      archivedAt: options.archived ? { not: null } : null,
      ...(options.domainId
        ? { domains: { some: { domainId: options.domainId } } }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { createdAt: { lt: cursor.at } },
                  { createdAt: cursor.at, id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    },
    include: { ...ideaInclude, history: { take: 0 } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
  });
  return {
    items: rows.slice(0, 30).map(ideaView),
    nextCursor:
      rows.length > 30
        ? encodeContentCursor(rows[29].createdAt, rows[29].id)
        : null,
  };
}
const decisionInclude = {
  content: true,
  project: true,
  goal: true,
  experiment: true,
  niche: true,
  season: true,
  supersedes: true,
  supersededBy: { take: 1 },
  history: { orderBy: { version: "desc" }, take: 21 },
  reflections: { orderBy: [{ reflectedOn: "desc" }, { id: "desc" }], take: 21 },
} satisfies Prisma.DecisionInclude;
type DecisionRow = Prisma.DecisionGetPayload<{
  include: typeof decisionInclude;
}>;
export function decisionChangeView(
  h: Prisma.DecisionChangeGetPayload<object>,
): DecisionView["history"][number] {
  return {
    id: h.id,
    version: h.version,
    reason: h.reason,
    createdAt: h.createdAt.toISOString(),
    snapshot: h.snapshot,
  };
}
export function decisionReflectionView(
  r: Prisma.DecisionReflectionGetPayload<object>,
): DecisionView["reflections"][number] {
  return {
    id: r.id,
    assessment:
      r.assessment as DecisionView["reflections"][number]["assessment"],
    reflection: r.reflection,
    reflectedOn: r.reflectedOn.toISOString().slice(0, 10),
    enteredAt: r.createdAt.toISOString(),
  };
}
function decisionView(d: DecisionRow): DecisionView {
  const links = [
    d.content
      ? {
          id: d.content.id,
          label: d.content.title,
          href: `/content/${d.content.id}`,
          archived: !!d.content.archivedAt,
        }
      : null,
    d.project
      ? {
          id: d.project.id,
          label: d.project.name,
          href: `/engineering/projects/${d.project.id}`,
          archived: !!d.project.archivedAt,
        }
      : null,
    d.goal
      ? {
          id: d.goal.id,
          label: d.goal.title,
          href: `/direction/goals/${d.goal.id}`,
          archived: !!d.goal.archivedAt,
        }
      : null,
    d.experiment
      ? {
          id: d.experiment.id,
          label: d.experiment.title,
          href: `/direction/experiments/${d.experiment.id}`,
          archived: !!d.experiment.archivedAt,
        }
      : null,
    d.niche
      ? {
          id: d.niche.id,
          label: d.niche.name,
          href: `/entrepreneurship/explorations/${d.niche.id}`,
          archived: !!d.niche.archivedAt,
        }
      : null,
    d.season
      ? {
          id: d.season.id,
          label: `${d.season.year} · Q${d.season.quarter}`,
          href: `/direction/seasons/${d.season.year}/${d.season.quarter}`,
          archived: false,
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  const linked = (
    r:
      | { id: string; choice: string; archivedAt: Date | null }
      | null
      | undefined,
  ) =>
    r
      ? {
          id: r.id,
          label: r.choice,
          href: `/direction/decisions/${r.id}`,
          archived: !!r.archivedAt,
        }
      : null;
  return {
    id: d.id,
    version: d.version,
    choice: d.choice,
    reason: d.reason,
    decidedOn: d.decidedOn.toISOString().slice(0, 10),
    context: d.context,
    alternatives: d.alternatives,
    expectedOutcome: d.expectedOutcome,
    reconsiderWhen: d.reconsiderWhen,
    reviewOn: d.reviewOn?.toISOString().slice(0, 10) ?? null,
    contentId: d.contentId ?? undefined,
    projectId: d.projectId ?? undefined,
    goalId: d.goalId ?? undefined,
    experimentId: d.experimentId ?? undefined,
    nicheId: d.nicheId ?? undefined,
    seasonId: d.seasonId ?? undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    archivedAt: d.archivedAt?.toISOString() ?? null,
    links,
    supersedes: linked(d.supersedes),
    supersededBy: linked(d.supersededBy[0]),
    history: d.history.slice(0, 20).map(decisionChangeView),
    historyNextCursor:
      d.history.length > 20 ? String(d.history[19].version) : null,
    reflections: d.reflections.slice(0, 20).map(decisionReflectionView),
    reflectionsNextCursor:
      d.reflections.length > 20
        ? encodeContentCursor(
            d.reflections[19].reflectedOn,
            d.reflections[19].id,
          )
        : null,
  };
}
export async function getDecision(
  userId: string,
  id: string,
): Promise<DecisionView | null> {
  const row = await prisma.decision.findFirst({
    where: { userId, id },
    include: decisionInclude,
  });
  return row ? decisionView(row) : null;
}
export async function getDecisions(
  userId: string,
  options: { q?: string; cursor?: string; archived?: boolean } = {},
): Promise<ThinkingPage<DecisionView>> {
  const cursor = decodeContentCursor(options.cursor),
    q = (options.q ?? "").trim().slice(0, 200);
  const rows = await prisma.decision.findMany({
    where: {
      userId,
      archivedAt: options.archived ? { not: null } : null,
      ...(q
        ? {
            OR: [
              { choice: { contains: q, mode: "insensitive" } },
              { reason: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { decidedOn: { lt: cursor.at } },
                  { decidedOn: cursor.at, id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    },
    include: {
      ...decisionInclude,
      history: { take: 0 },
      reflections: {
        orderBy: [{ reflectedOn: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ decidedOn: "desc" }, { id: "desc" }],
    take: 31,
  });
  return {
    items: rows.slice(0, 30).map(decisionView),
    nextCursor:
      rows.length > 30
        ? encodeContentCursor(rows[29].decidedOn, rows[29].id)
        : null,
  };
}
export async function getThinkingOptions(
  userId: string,
  context: DecisionContext = {},
): Promise<ThinkingOptions> {
  const [domains, content, goals, experiments, projects, niches, seasons] =
    await Promise.all([
      prisma.domain.findMany({
        select: { id: true, name: true },
        where: { userId, enabled: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.content.findMany({
        select: { id: true, title: true },
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.goal.findMany({
        select: { id: true, title: true },
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.experiment.findMany({
        select: { id: true, title: true },
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.engineeringProject.findMany({
        select: { id: true, name: true },
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.niche.findMany({
        select: { id: true, name: true },
        where: { userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.userSeason.findMany({
        select: { id: true, year: true, quarter: true },
        where: { userId },
        orderBy: [{ year: "desc" }, { quarter: "desc" }],
        take: 40,
      }),
    ]);
  const result: ThinkingOptions = {
    domains: domains.map((d) => ({ id: d.id, name: d.name })),
    content: content.map((d) => ({ id: d.id, name: d.title })),
    goals: goals.map((d) => ({ id: d.id, name: d.title })),
    experiments: experiments.map((d) => ({ id: d.id, name: d.title })),
    projects: projects.map((d) => ({ id: d.id, name: d.name })),
    niches: niches.map((d) => ({ id: d.id, name: d.name })),
    seasons: seasons.map((d) => ({
      id: d.id,
      name: `${d.year} · Q${d.quarter}`,
    })),
  };
  const selected = await Promise.all([
    context.contentId && !result.content.some((r) => r.id === context.contentId)
      ? prisma.content
          .findFirst({
            where: { id: context.contentId, userId },
            select: { id: true, title: true },
          })
          .then((r) =>
            r
              ? { key: "content" as const, option: { id: r.id, name: r.title } }
              : null,
          )
      : null,
    context.goalId && !result.goals.some((r) => r.id === context.goalId)
      ? prisma.goal
          .findFirst({
            where: { id: context.goalId, userId },
            select: { id: true, title: true },
          })
          .then((r) =>
            r
              ? { key: "goals" as const, option: { id: r.id, name: r.title } }
              : null,
          )
      : null,
    context.experimentId &&
    !result.experiments.some((r) => r.id === context.experimentId)
      ? prisma.experiment
          .findFirst({
            where: { id: context.experimentId, userId },
            select: { id: true, title: true },
          })
          .then((r) =>
            r
              ? {
                  key: "experiments" as const,
                  option: { id: r.id, name: r.title },
                }
              : null,
          )
      : null,
    context.projectId &&
    !result.projects.some((r) => r.id === context.projectId)
      ? prisma.engineeringProject
          .findFirst({
            where: { id: context.projectId, userId },
            select: { id: true, name: true },
          })
          .then((r) => (r ? { key: "projects" as const, option: r } : null))
      : null,
    context.nicheId && !result.niches.some((r) => r.id === context.nicheId)
      ? prisma.niche
          .findFirst({
            where: { id: context.nicheId, userId },
            select: { id: true, name: true },
          })
          .then((r) => (r ? { key: "niches" as const, option: r } : null))
      : null,
    context.seasonId && !result.seasons.some((r) => r.id === context.seasonId)
      ? prisma.userSeason
          .findFirst({
            where: { id: context.seasonId, userId },
            select: { id: true, year: true, quarter: true },
          })
          .then((r) =>
            r
              ? {
                  key: "seasons" as const,
                  option: { id: r.id, name: `${r.year} · Q${r.quarter}` },
                }
              : null,
          )
      : null,
  ]);
  for (const row of selected) if (row) result[row.key].push(row.option);
  return result;
}
