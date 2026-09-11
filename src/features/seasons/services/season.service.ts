import { seasonCalendar } from "@/features/seasons/utils/season-calendar.util";
import { z } from "zod";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  seasonDraftSchema,
  seasonIdentitySchema,
} from "@/features/seasons/schemas/season.schema";
import { operationKey } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
export async function lockSeason(
  tx: DirectionTx,
  userId: string,
  year: number,
  quarter: number,
) {
  await lockDirection(tx, userId, `season:${year}:${quarter}`);
  return tx.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
  });
}
export async function saveSeason(userId: string, input: unknown) {
  const c = seasonIdentitySchema
      .extend({
        expectedVersion: z.number().int().min(0),
        operationKey,
        draft: seasonDraftSchema,
        complete: z.boolean().optional(),
      })
      .parse(input),
    hash = fingerprint(c);
  return prisma.$transaction(async (tx) => {
    const old = await lockSeason(tx, userId, c.year, c.quarter);
    const prior = await tx.seasonChange.findUnique({
      where: { userId_operationKey: { userId, operationKey: c.operationKey } },
    });
    if (prior) {
      if (prior.fingerprint !== hash)
        throw new DirectionError(
          "This submission was saved with different answers.",
        );
      return { id: prior.seasonId, version: prior.version };
    }
    requireVersion(old?.version ?? 0, c.expectedVersion);
    for (const standard of c.draft.character.standards) {
      if (
        standard.goalId &&
        !(await tx.goal.findFirst({ where: { id: standard.goalId, userId } }))
      )
        throw new DirectionError(
          "Choose a goal you own.",
          `character.standards.${standard.key}.goalId`,
        );
      if (
        standard.criterionId &&
        !(await tx.directionCriterion.findFirst({
          where: {
            id: standard.criterionId,
            userId,
            ...(standard.goalId ? { goalId: standard.goalId } : {}),
          },
        }))
      )
        throw new DirectionError(
          "Choose a criterion from this goal.",
          `character.standards.${standard.key}.criterionId`,
        );
    }
    const activeIdentity = old
      ? await getCotsIdentity(userId, old.id, tx)
      : null;
    if (old?.closedAt) throw new DirectionError("This season is closed.");
    if (
      c.complete &&
      old &&
      (await tx.seasonCotsSelection.count({
        where: {
          userId,
          seasonId: old.id,
          desiredPoster: true,
          status: { in: ["SELECTED", "PENDING", "IMPORTING", "FAILED"] },
        },
      }))
    )
      throw new DirectionError(
        "Your chosen poster is still pending. Wait and retry, or explicitly begin with your current poster.",
      );
    const data = {
      ...c.draft,
      answers: jsonValue(c.draft.answers),
      character: jsonValue(
        activeIdentity
          ? {
              ...c.draft.character,
              name: activeIdentity.view.displayName,
              sourceCategory: activeIdentity.view.sourceCategory,
              sourceWork: activeIdentity.view.sourceWork,
              adaptation: activeIdentity.view.adaptation,
            }
          : c.draft.character,
      ),
      openingCompletedAt:
        old?.openingCompletedAt ?? (c.complete ? new Date() : null),
    };
    const row = old
      ? await tx.userSeason.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.userSeason.create({
          data: { ...data, userId, year: c.year, quarter: c.quarter },
        });
    if (c.complete && !old?.openingCompletedAt) {
      const phase = seasonCalendar(c.year, c.quarter).phase;
      // A late opening itself fulfills the current check-in; do not immediately ask to return.
      if (["MIDPOINT", "FINAL_14", "FINAL_7", "FINAL_3"].includes(phase))
        await tx.seasonMilestone.upsert({
          where: { seasonId_key: { seasonId: row.id, key: phase } },
          create: {
            userId,
            seasonId: row.id,
            key: phase,
            disposition: "OPENING_FULFILLED",
          },
          update: {},
        });
    }
    await tx.seasonChange.create({
      data: {
        userId,
        seasonId: row.id,
        version: row.version,
        operationKey: c.operationKey,
        fingerprint: hash,
        kind: c.complete ? "OPENED" : "OPENING_SAVED",
        reason: c.complete ? "Opening confirmed." : "Opening answers saved.",
        snapshot: jsonValue(c.draft),
      },
    });
    return { id: row.id, version: row.version };
  });
}
export async function assignSeasonGoals(userId: string, input: unknown) {
  const c = seasonIdentitySchema
      .extend({
        expectedVersion: z.number().int(),
        operationKey,
        goals: z
          .array(
            z.object({
              goalId: z.string(),
              role: z.enum(["PRIMARY", "SUPPORTING"]),
              note: z.string().trim().max(2000).default(""),
            }),
          )
          .max(30),
      })
      .parse(input),
    hash = fingerprint(c);
  if (c.goals.filter((g) => g.role === "PRIMARY").length > 1)
    throw new DirectionError("Choose at most one main goal.", "goals");
  if (new Set(c.goals.map((g) => g.goalId)).size !== c.goals.length)
    throw new DirectionError("A goal can appear once in a season.", "goals");
  return prisma.$transaction(async (tx) => {
    const row = await lockSeason(tx, userId, c.year, c.quarter);
    const prior = await tx.seasonChange.findUnique({
      where: { userId_operationKey: { userId, operationKey: c.operationKey } },
    });
    if (prior) {
      if (prior.fingerprint !== hash)
        throw new DirectionError(
          "This submission was saved with different goals.",
        );
      return { id: prior.seasonId, version: prior.version };
    }
    if (!row) throw new DirectionError("Save your opening first.");
    requireVersion(row.version, c.expectedVersion);
    if (
      (await tx.goal.count({
        where: { userId, id: { in: c.goals.map((g) => g.goalId) } },
      })) !== c.goals.length
    )
      throw new DirectionError("Choose goals you own.", "goals");
    await tx.seasonGoal.deleteMany({ where: { seasonId: row.id, userId } });
    await tx.seasonGoal.createMany({
      data: c.goals.map((g, position) => ({
        ...g,
        userId,
        seasonId: row.id,
        position,
      })),
    });
    const updated = await tx.userSeason.update({
      where: { id: row.id },
      data: { version: { increment: 1 } },
    });
    await tx.seasonChange.create({
      data: {
        userId,
        seasonId: row.id,
        version: updated.version,
        operationKey: c.operationKey,
        fingerprint: hash,
        kind: "DIRECTION_CHANGED",
        reason: "Seasonal roles chosen; goal horizons remain unchanged.",
        snapshot: jsonValue(c.goals),
      },
    });
    return { id: row.id, version: updated.version };
  });
}
