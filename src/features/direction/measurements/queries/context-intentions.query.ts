import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { boundedExcerpt } from "@/features/reviews/facts/utils/review-payload.util";
import type { ContextIntention } from "@/features/reviews/retrieval/types/retrieval.types";

export async function readContextIntentions(
  tx: DirectionTx,
  userId: string,
  seasonId: string | null,
) {
  const where = {
    userId,
    status: { in: ["ACTIVE", "PAUSED"] },
    archivedAt: null,
  };
  const goals = await tx.goal.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      startOn: true,
      targetOn: true,
      version: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 4,
  });
  const experiments = await tx.experiment.findMany({
    where,
    select: {
      id: true,
      title: true,
      question: true,
      status: true,
      startOn: true,
      targetOn: true,
      version: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 3,
  });
  const goalCount = await tx.goal.count({ where }),
    experimentCount = await tx.experiment.count({ where });
  const selected = seasonId
    ? await tx.seasonGoal.findMany({
        where: { userId, seasonId },
        select: { goalId: true, role: true, goal: { select: { title: true } } },
        orderBy: [{ position: "asc" }, { goalId: "asc" }],
        take: 5,
      })
    : [];
  const activeIntentions: ContextIntention[] = [
    ...goals.map((g) => ({ ...g, kind: "GOAL" as const })),
    ...experiments.map((e) => ({
      ...e,
      description: e.question,
      kind: "EXPERIMENT" as const,
    })),
  ].map((r) => ({
    id: r.id,
    kind: r.kind,
    title: boundedExcerpt(r.title, 300),
    description: boundedExcerpt(r.description, 600),
    status: r.status,
    startOn: r.startOn.toISOString().slice(0, 10),
    targetOn: r.targetOn?.toISOString().slice(0, 10) ?? null,
    href: `/direction/${r.kind === "GOAL" ? "goals" : "experiments"}/${r.id}`,
    version: r.version,
  }));
  return {
    activeIntentions,
    priorities: selected.map((s) => ({
      id: s.goalId,
      title: boundedExcerpt(s.goal.title, 300),
      role: s.role,
      href: `/direction/goals/${s.goalId}`,
    })),
    omitted: Math.max(0, goalCount + experimentCount - activeIntentions.length),
  };
}
