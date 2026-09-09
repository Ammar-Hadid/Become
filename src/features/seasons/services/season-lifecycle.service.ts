import { DateTime } from "luxon";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { operationKey } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  requireVersion,
  retryDirectionTransaction,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { seasonCalendar } from "@/features/seasons/utils/season-calendar.util";
import { getSeasonView } from "@/features/seasons/queries/season.query";
export async function changeSeasonLifecycle(userId: string, input: unknown) {
  const c = seasonIdentitySchema
      .extend({
        expectedVersion: z.number().int(),
        operationKey,
        action: z.enum(["ACKNOWLEDGE", "SNOOZE", "CLOSE"]),
        milestone: z
          .enum(["MIDPOINT", "FINAL_14", "FINAL_7", "FINAL_3", "ENDED"])
          .optional(),
        snoozeDays: z
          .union([z.literal(1), z.literal(3), z.literal(7)])
          .optional(),
        note: z.string().trim().max(6000).optional(),
      })
      .parse(input),
    hash = fingerprint(c);
  return retryDirectionTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const row = await lockSeason(tx, userId, c.year, c.quarter);
        const prior = await tx.seasonChange.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: c.operationKey },
          },
        });
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This submission was saved with different values.",
            );
          return { id: prior.seasonId, version: prior.version };
        }
        if (!row) throw new DirectionError("Save your opening first.");
        requireVersion(row.version, c.expectedVersion);
        if (row.closedAt)
          throw new DirectionError(
            "This chapter is already closed. Its goals can continue independently.",
          );
        const now = DateTime.now().setZone("Europe/Amsterdam"),
          calendar = seasonCalendar(c.year, c.quarter, now);
        let snapshot: unknown = c;
        if (c.action === "CLOSE") {
          if (calendar.phase !== "ENDED")
            throw new DirectionError(
              "A season can be closed after its calendar quarter ends.",
            );
          const view = await getSeasonView(userId, c.year, c.quarter, tx);
          snapshot = {
            capturedAt: now.toISO(),
            title: view.title,
            intention: view.intention,
            calendar: view.calendar,
            character: view.character,
            media: view.media,
            quotes: view.quotes,
            note: c.note ?? "",
            goals: view.goals.map((g) => ({
              id: g.goal.id,
              title: g.goal.title,
              role: g.role,
              status: g.goal.status,
              outcome: g.goal.outcome,
              horizon: { startOn: g.goal.startOn, targetOn: g.goal.targetOn },
              evaluation: g.goal.evaluation,
            })),
            experiments: view.experiments.map((e) => ({
              id: e.id,
              title: e.title,
              status: e.status,
              outcome: e.outcome,
              evaluation: e.evaluation,
            })),
          };
          await tx.userSeason.update({
            where: { id: row.id },
            data: {
              closedAt: now.toJSDate(),
              closingNote: c.note ?? "",
              closingSnapshot: jsonValue(snapshot),
              readyForReview: true,
            },
          });
        } else {
          if (
            c.milestone !== calendar.phase ||
            !["MIDPOINT", "FINAL_14", "FINAL_7", "FINAL_3", "ENDED"].includes(
              calendar.phase,
            )
          )
            throw new DirectionError(
              "This seasonal cue has moved on. Review the current chapter.",
            );
          if (c.action === "ACKNOWLEDGE")
            await tx.seasonMilestone.upsert({
              where: { seasonId_key: { seasonId: row.id, key: c.milestone } },
              create: {
                userId,
                seasonId: row.id,
                key: c.milestone,
                disposition: "ACKNOWLEDGED",
              },
              update: {
                disposition: "ACKNOWLEDGED",
                acknowledgedAt: now.toJSDate(),
              },
            });
          else
            await tx.userSeason.update({
              where: { id: row.id },
              data: {
                snoozedUntil: now.plus({ days: c.snoozeDays ?? 3 }).toJSDate(),
              },
            });
        }
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
            kind: c.action,
            reason:
              c.note ||
              (c.action === "CLOSE"
                ? "Chapter closed; ready for a future review."
                : "Seasonal cue acknowledged."),
            snapshot: jsonValue(snapshot),
          },
        });
        return { id: row.id, version: updated.version };
      },
      { isolationLevel: "Serializable", timeout: 20000 },
    ),
  );
}
