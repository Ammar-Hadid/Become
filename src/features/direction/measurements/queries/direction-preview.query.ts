import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  goalDraftSchema,
  experimentDraftSchema,
} from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  dateLabel,
} from "@/features/direction/services/direction-mutation.service";
import { validateCriterion } from "@/features/direction/services/criterion.service";
import {
  validateExperimentSources,
  validateExperimentContentSources,
} from "@/features/direction/services/experiment.service";
import {
  criterionDraft,
  evaluateCriterion,
  evaluateDirection,
} from "@/features/direction/measurements/services/criterion-evaluation.service";
export async function previewDirection(userId: string, input: unknown) {
  const c = z
    .discriminatedUnion("kind", [
      z.object({
        kind: z.literal("GOAL"),
        id: z.string().optional(),
        draft: goalDraftSchema,
      }),
      z.object({
        kind: z.literal("EXPERIMENT"),
        id: z.string().optional(),
        draft: experimentDraftSchema,
      }),
    ])
    .parse(input);
  return prisma.$transaction(
    async (tx) => {
      const owner = c.id
        ? c.kind === "GOAL"
          ? await tx.goal.findFirst({ where: { id: c.id, userId } })
          : await tx.experiment.findFirst({ where: { id: c.id, userId } })
        : null;
      if (c.id && !owner) throw new DirectionError("Intention not found.");
      for (const criterion of c.draft.criteria) {
        await validateCriterion(tx, userId, criterion);
        if (
          c.kind === "GOAL" &&
          (criterion.selectedOutreachOnly || criterion.selectedContentOnly)
        )
          throw new DirectionError(
            "Selected outreach belongs to an experiment.",
          );
        if (
          criterion.id &&
          (!owner ||
            !(await tx.directionCriterion.findFirst({
              where: {
                id: criterion.id,
                userId,
                ...(c.kind === "GOAL"
                  ? { goalId: owner.id }
                  : { experimentId: owner.id }),
              },
            })))
        )
          throw new DirectionError(
            "This criterion belongs to another intention.",
          );
      }
      if (c.kind === "EXPERIMENT")
        await validateExperimentSources(
          tx,
          userId,
          c.draft.sourceInteractionIds,
        );
      if (c.kind === "EXPERIMENT")
        await validateExperimentContentSources(
          tx,
          userId,
          c.draft.sourceContentIds ?? [],
        );
      return evaluateDirection(
        tx,
        userId,
        c.draft.criteria,
        c.draft,
        c.draft.criterionMode,
        new Date(),
        c.kind === "EXPERIMENT" ? c.draft.sourceInteractionIds : undefined,
        c.kind === "EXPERIMENT" ? (c.draft.sourceContentIds ?? []) : undefined,
      );
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
export async function getCriterionSources(
  userId: string,
  id: string,
  offset: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const criterion = await tx.directionCriterion.findFirst({
        where: { id, userId },
        include: {
          goal: true,
          experiment: { include: { sources: true, contentSources: true } },
        },
      });
      if (!criterion) return null;
      const owner = criterion.goal ?? criterion.experiment!;
      return evaluateCriterion(
        tx,
        userId,
        criterionDraft(criterion),
        {
          startOn: dateLabel(owner.startOn)!,
          targetOn: dateLabel(owner.targetOn),
        },
        new Date(),
        criterion.experiment?.sources.map((s) => s.interactionId),
        offset,
        criterion.experiment?.contentSources.map((s) => s.contentId),
      );
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
