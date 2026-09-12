import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  goalDraftSchema,
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
export async function saveGoal(
  userId: string,
  input: unknown,
  transaction?: DirectionTx,
) {
  const c = z
    .object({
      id: z.string().optional(),
      expectedVersion: z.number().int().optional(),
      operationKey,
      draft: goalDraftSchema,
      reason: z.string().trim().max(2000).optional(),
    })
    .parse(input);
  const hash = fingerprint(c);
  const mutate = async (tx: DirectionTx) => {
    await lockDirection(tx, userId, "goals");
    const prior = await tx.goalChange.findUnique({
      where: { userId_operationKey: { userId, operationKey: c.operationKey } },
    });
    if (prior) {
      if (prior.fingerprint !== hash)
        throw new DirectionError(
          "This submission was already saved with different values.",
        );
      return { id: prior.goalId, version: prior.version };
    }
    const old = c.id
      ? await tx.goal.findFirst({
          where: { id: c.id, userId },
          include: { criteria: true, domains: true },
        })
      : null;
    if (c.id && !old) throw new DirectionError("Goal not found.");
    if (old) {
      requireVersion(old.version, c.expectedVersion);
      if (!c.reason?.trim())
        throw new DirectionError("Explain what changed and why.", "reason");
      if (old.status === "CONCLUDED")
        throw new DirectionError(
          "Reopen this goal before changing its intention.",
        );
    }
    const ids = [...new Set(c.draft.domainIds)];
    if (
      (await tx.domain.count({ where: { userId, id: { in: ids } } })) !==
      ids.length
    )
      throw new DirectionError("Choose your own domains.", "domainIds");
    const { criteria, domainIds, ...draft } = c.draft;
    void domainIds;
    const data = {
      title: draft.title,
      description: draft.description ?? "",
      startOn: storedDate(draft.startOn),
      targetOn: draft.targetOn ? storedDate(draft.targetOn) : null,
      criterionMode: draft.criterionMode,
    };
    const goal = old
      ? await tx.goal.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.goal.create({ data: { ...data, userId } });
    await tx.goalDomain.deleteMany({ where: { goalId: goal.id, userId } });
    await tx.goalDomain.createMany({
      data: ids.map((domainId) => ({ userId, goalId: goal.id, domainId })),
    });
    await saveCriteria(tx, userId, { goalId: goal.id }, criteria);
    const capturedCriteria = await tx.directionCriterion.findMany({
      where: { userId, goalId: goal.id },
      include: criterionRelations,
    });
    await tx.goalChange.create({
      data: {
        userId,
        goalId: goal.id,
        version: goal.version,
        operationKey: c.operationKey,
        fingerprint: hash,
        kind: old ? "EDIT" : "CREATED",
        reason: c.reason ?? (old ? "Updated intention." : "Goal created."),
        snapshot: jsonValue({
          draft: c.draft,
          criterionScopes: criterionScopes(capturedCriteria),
        }),
      },
    });
    return { id: goal.id, version: goal.version };
  };
  return transaction ? mutate(transaction) : prisma.$transaction(mutate);
}
