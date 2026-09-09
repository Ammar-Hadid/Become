import { z } from "zod";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  dayInput,
  operationKey,
} from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  retryDirectionTransaction,
  storedDate,
  dateLabel,
} from "@/features/direction/services/direction-mutation.service";
import { measurementWindow } from "@/features/direction/measurements/utils/measurement-window.util";
import {
  criterionDraft,
  manualDefinition,
} from "@/features/direction/measurements/services/criterion-evaluation.service";
import {
  evidenceReferenceSchema,
  resolveEvidenceSet,
} from "@/features/direction/evidence/services/evidence-reference.service";
export async function assessCriterion(userId: string, input: unknown) {
  const c = z
      .object({
        criterionId: z.string(),
        expectedVersion: z.number().int(),
        operationKey,
        confirmed: z.boolean(),
        rationale: z
          .string()
          .trim()
          .min(1, "Explain your assessment.")
          .max(6000),
        assessedOn: dayInput,
        sources: z.array(evidenceReferenceSchema).max(20),
      })
      .parse(input),
    hash = fingerprint(c);
  if (c.assessedOn > DateTime.now().setZone("Europe/Amsterdam").toISODate()!)
    throw new DirectionError(
      "An assessment cannot be dated in the future.",
      "assessedOn",
    );
  return retryDirectionTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const criterion = await tx.directionCriterion.findFirst({
          where: { id: c.criterionId, userId },
          include: { goal: true, experiment: true },
        });
        if (!criterion || criterion.metric !== "MANUAL")
          throw new DirectionError(
            "Manual assessment applies only to a qualitative criterion.",
          );
        const isGoal = Boolean(criterion.goalId);
        await lockDirection(tx, userId, isGoal ? "goals" : "experiments");
        const prior = await tx.criterionAssessment.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: c.operationKey },
          },
        });
        const owner = isGoal
          ? await tx.goal.findFirst({
              where: { id: criterion.goalId!, userId },
            })
          : await tx.experiment.findFirst({
              where: { id: criterion.experimentId!, userId },
            });
        if (!owner) throw new DirectionError("Intention not found.");
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This submission was saved with different evidence.",
            );
          return { id: owner.id, version: owner.version };
        }
        requireVersion(owner.version, c.expectedVersion);
        if (owner.status === "CONCLUDED")
          throw new DirectionError("Reopen before recording a new assessment.");
        if (
          c.assessedOn <
          (dateLabel(criterion.startOn) ?? dateLabel(owner.startOn)!)
        )
          throw new DirectionError(
            "Date the assessment within this intention's horizon.",
            "assessedOn",
          );
        const sources = await resolveEvidenceSet(tx, userId, c.sources);
        const window = measurementWindow(
          criterionDraft(criterion),
          {
            startOn: dateLabel(owner.startOn)!,
            targetOn: dateLabel(owner.targetOn),
          },
          new Date(),
        );
        if (
          sources.some(
            (s) =>
              s.item.occurredAt &&
              (new Date(s.item.occurredAt) < window.start ||
                new Date(s.item.occurredAt) >= window.end),
          )
        )
          throw new DirectionError(
            "Choose evidence recorded within this criterion's measurement dates.",
            "sources",
          );
        await tx.criterionAssessment.create({
          data: {
            userId,
            criterionId: criterion.id,
            operationKey: c.operationKey,
            fingerprint: hash,
            confirmed: c.confirmed,
            rationale: c.rationale,
            assessedOn: storedDate(c.assessedOn),
            sourceReferences: jsonValue({
              definition: manualDefinition(criterionDraft(criterion), {
                startOn: dateLabel(owner.startOn)!,
                targetOn: dateLabel(owner.targetOn),
              }),
              sources,
            }),
          },
        });
        const snapshot = jsonValue({ ...c, sources });
        if (isGoal) {
          const updated = await tx.goal.update({
            where: { id: owner.id },
            data: { version: { increment: 1 } },
          });
          await tx.goalChange.create({
            data: {
              userId,
              goalId: owner.id,
              version: updated.version,
              operationKey: c.operationKey,
              fingerprint: hash,
              kind: "ASSESSMENT",
              reason: c.rationale,
              snapshot,
            },
          });
          return { id: owner.id, version: updated.version };
        }
        const updated = await tx.experiment.update({
          where: { id: owner.id },
          data: { version: { increment: 1 } },
        });
        await tx.experimentChange.create({
          data: {
            userId,
            experimentId: owner.id,
            version: updated.version,
            operationKey: c.operationKey,
            fingerprint: hash,
            kind: "ASSESSMENT",
            reason: c.rationale,
            snapshot,
          },
        });
        return { id: owner.id, version: updated.version };
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
