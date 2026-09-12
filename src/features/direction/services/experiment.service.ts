import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  experimentDraftSchema,
  operationKey,
} from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  storedDate,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { saveCriteria } from "@/features/direction/services/criterion.service";
import {
  criterionRelations,
  criterionScopes,
} from "@/features/direction/mappers/criterion-scope.mapper";
export async function validateExperimentSources(
  tx: DirectionTx,
  userId: string,
  ids: string[],
) {
  if (new Set(ids).size !== ids.length)
    throw new DirectionError(
      "Choose each outreach record once.",
      "sourceInteractionIds",
    );
  const sources = await tx.interaction.findMany({
    where: { userId, id: { in: ids }, voidedAt: null },
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (
    sources.length !== ids.length ||
    sources.some((s) => s.revisions[0]?.kind !== "OUTREACH_SENT")
  )
    throw new DirectionError(
      "Trial sources must be your current, non-withdrawn outreach records.",
      "sourceInteractionIds",
    );
}
export async function validateExperimentContentSources(
  tx: DirectionTx,
  userId: string,
  ids: string[],
) {
  if (
    new Set(ids).size !== ids.length ||
    (await tx.content.count({ where: { userId, id: { in: ids } } })) !==
      ids.length
  )
    throw new DirectionError(
      "Choose each owned creative work once.",
      "sourceContentIds",
    );
}
export async function saveExperiment(
  userId: string,
  input: unknown,
  transaction?: DirectionTx,
) {
  const c = z
      .object({
        id: z.string().optional(),
        expectedVersion: z.number().int().optional(),
        operationKey,
        draft: experimentDraftSchema,
        reason: z.string().trim().max(2000).optional(),
      })
      .parse(input),
    hash = fingerprint(c);
  const mutate = async (tx: DirectionTx) => {
    await lockDirection(tx, userId, "experiments");
    const prior = await tx.experimentChange.findUnique({
      where: { userId_operationKey: { userId, operationKey: c.operationKey } },
    });
    if (prior) {
      if (prior.fingerprint !== hash)
        throw new DirectionError(
          "This submission was already saved with different values.",
        );
      return { id: prior.experimentId, version: prior.version };
    }
    const old = c.id
      ? await tx.experiment.findFirst({ where: { id: c.id, userId } })
      : null;
    if (c.id && !old) throw new DirectionError("Experiment not found.");
    if (old) {
      requireVersion(old.version, c.expectedVersion);
      if (!c.reason?.trim())
        throw new DirectionError("Explain what changed and why.", "reason");
      if (old.status === "CONCLUDED")
        throw new DirectionError(
          "Reopen this experiment before changing the trial.",
        );
      if (old.repeatedFromId !== (c.draft.repeatedFromId ?? null))
        throw new DirectionError("An attempt's lineage cannot be changed.");
    }
    const ids = [...new Set(c.draft.domainIds)];
    if (
      (await tx.domain.count({ where: { userId, id: { in: ids } } })) !==
      ids.length
    )
      throw new DirectionError("Choose your own domains.", "domainIds");
    if (
      c.draft.goalId &&
      !(await tx.goal.findFirst({ where: { id: c.draft.goalId, userId } }))
    )
      throw new DirectionError("Choose a goal you own.", "goalId");
    if (
      !old &&
      c.draft.repeatedFromId &&
      !(await tx.experiment.findFirst({
        where: { id: c.draft.repeatedFromId, userId, status: "CONCLUDED" },
      }))
    )
      throw new DirectionError(
        "Conclude the previous attempt before repeating it.",
        "repeatedFromId",
      );
    await validateExperimentSources(tx, userId, c.draft.sourceInteractionIds);
    const {
      criteria,
      domainIds,
      sourceInteractionIds,
      sourceContentIds = [],
      ...draft
    } = c.draft;
    await validateExperimentContentSources(tx, userId, sourceContentIds);
    void domainIds;
    const data = {
      ...draft,
      startOn: storedDate(draft.startOn),
      targetOn: draft.targetOn ? storedDate(draft.targetOn) : null,
      goalId: draft.goalId ?? null,
      repeatedFromId: draft.repeatedFromId ?? null,
    };
    const row = old
      ? await tx.experiment.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.experiment.create({ data: { ...data, userId } });
    await tx.experimentDomain.deleteMany({
      where: { userId, experimentId: row.id },
    });
    await tx.experimentDomain.createMany({
      data: ids.map((domainId) => ({ userId, experimentId: row.id, domainId })),
    });
    await tx.experimentSource.deleteMany({
      where: { userId, experimentId: row.id },
    });
    await tx.experimentSource.createMany({
      data: sourceInteractionIds.map((interactionId) => ({
        userId,
        experimentId: row.id,
        interactionId,
      })),
    });
    await tx.experimentContentSource.deleteMany({
      where: { userId, experimentId: row.id },
    });
    await tx.experimentContentSource.createMany({
      data: sourceContentIds.map((contentId) => ({
        userId,
        experimentId: row.id,
        contentId,
      })),
    });
    await saveCriteria(tx, userId, { experimentId: row.id }, criteria);
    const capturedCriteria = await tx.directionCriterion.findMany({
      where: { userId, experimentId: row.id },
      include: criterionRelations,
    });
    await tx.experimentChange.create({
      data: {
        userId,
        experimentId: row.id,
        version: row.version,
        operationKey: c.operationKey,
        fingerprint: hash,
        kind: old ? "EDIT" : c.draft.repeatedFromId ? "REPEATED" : "CREATED",
        reason: c.reason || (old ? "Trial updated." : "A bounded trial began."),
        snapshot: jsonValue({
          draft: c.draft,
          criterionScopes: criterionScopes(capturedCriteria),
        }),
      },
    });
    return { id: row.id, version: row.version };
  };
  return transaction ? mutate(transaction) : prisma.$transaction(mutate);
}
