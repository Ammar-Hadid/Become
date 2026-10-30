import { seasonCalendar } from "@/features/seasons/utils/season-calendar.util";
import { z } from "zod";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  seasonIdentityDraftSchema,
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
        draft: seasonIdentityDraftSchema,
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
    const activeIdentity = old
      ? await getCotsIdentity(userId, old.id, tx)
      : null;
    if (old?.closedAt) throw new DirectionError("This season is closed.");
    const priorCharacter =
      old?.character &&
      typeof old.character === "object" &&
      !Array.isArray(old.character)
        ? old.character
        : { motivation: "", avoid: "", standards: [] };
    const character = { ...priorCharacter, ...c.draft.character };
    const data = {
      stage: 3,
      character: jsonValue(
        activeIdentity
          ? {
              ...character,
              name: activeIdentity.view.displayName,
              sourceCategory: activeIdentity.view.sourceCategory,
              sourceWork: activeIdentity.view.sourceWork,
              adaptation: activeIdentity.view.adaptation,
            }
          : character,
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
        reason: c.complete ? "Opening confirmed." : "Season inspiration saved.",
        snapshot: jsonValue({
          title: row.title,
          intention: row.intention,
          answers: row.answers,
          character: row.character,
          stage: row.stage,
        }),
      },
    });
    return { id: row.id, version: row.version };
  });
}
