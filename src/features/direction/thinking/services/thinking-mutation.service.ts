import { linkIdeaOutput } from "@/features/direction/thinking/services/idea-output.service";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { thinkingCommandSchema } from "@/features/direction/thinking/schemas/thinking.schema";
import { createContentInTransaction } from "@/features/content/services/content-mutation.service";
import { saveGoal } from "@/features/direction/services/goal.service";
import { saveExperiment } from "@/features/direction/services/experiment.service";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  storedDate,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import type { DecisionContext } from "@/features/direction/thinking/types/thinking.types";
export async function validateDecisionContext(
  tx: DirectionTx,
  userId: string,
  c: DecisionContext,
) {
  const entries = await Promise.all([
    c.contentId
      ? tx.content.findFirst({ where: { id: c.contentId, userId } })
      : true,
    c.projectId
      ? tx.engineeringProject.findFirst({ where: { id: c.projectId, userId } })
      : true,
    c.goalId ? tx.goal.findFirst({ where: { id: c.goalId, userId } }) : true,
    c.experimentId
      ? tx.experiment.findFirst({ where: { id: c.experimentId, userId } })
      : true,
    c.nicheId ? tx.niche.findFirst({ where: { id: c.nicheId, userId } }) : true,
    c.seasonId
      ? tx.userSeason.findFirst({ where: { id: c.seasonId, userId } })
      : true,
  ]);
  if (entries.some((x) => !x))
    throw new DirectionError("Choose related records you own.");
}
export async function executeThinkingCommand(userId: string, input: unknown) {
  const c = thinkingCommandSchema.parse(input),
    hash = fingerprint(c);
  return prisma.$transaction(
    async (tx) => {
      await lockDirection(tx, userId, `thinking-operation:${c.operationKey}`);
      const prior = await tx.thinkingMutation.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: c.operationKey },
        },
      });
      if (prior) {
        if (prior.fingerprint !== hash)
          throw new DirectionError(
            "This submission was already saved with different values.",
            undefined,
            409,
          );
        return prior.result as {
          id: string;
          version?: number;
          href: string;
          ideaId?: string;
          decisionId?: string;
        };
      }
      let result: {
        id: string;
        version?: number;
        href: string;
        ideaId?: string;
        decisionId?: string;
      };
      if (c.type === "PROMOTE_IDEA" || c.type === "LINK_IDEA") {
        await lockDirection(tx, userId, `idea:${c.ideaId}`);
        if (c.type === "PROMOTE_IDEA") {
          if (c.destination === "CONTENT") {
            const row = await createContentInTransaction(
              tx,
              userId,
              c.draft,
              c.format,
              c.ideaId,
            );
            result = {
              id: row.id,
              version: row.version,
              href: `/content/${row.id}`,
              ideaId: c.ideaId,
            };
          } else {
            const row =
              c.destination === "GOAL"
                ? await saveGoal(
                    userId,
                    { operationKey: c.operationKey, draft: c.draft },
                    tx,
                  )
                : await saveExperiment(
                    userId,
                    { operationKey: c.operationKey, draft: c.draft },
                    tx,
                  );
            await linkIdeaOutput(
              tx,
              userId,
              c.ideaId,
              c.destination === "GOAL"
                ? { goalId: row.id }
                : { experimentId: row.id },
              "CREATED",
            );
            result = {
              ...row,
              href: `/direction/${c.destination === "GOAL" ? "goals" : "experiments"}/${row.id}`,
              ideaId: c.ideaId,
            };
          }
        } else {
          const destination =
            c.destination === "CONTENT"
              ? await tx.content.findFirst({
                  where: { id: c.destinationId, userId },
                })
              : c.destination === "GOAL"
                ? await tx.goal.findFirst({
                    where: { id: c.destinationId, userId },
                  })
                : await tx.experiment.findFirst({
                    where: { id: c.destinationId, userId },
                  });
          if (!destination)
            throw new DirectionError(
              "Choose an existing destination you own.",
              "destinationId",
              404,
            );
          await linkIdeaOutput(
            tx,
            userId,
            c.ideaId,
            c.destination === "CONTENT"
              ? { contentId: destination.id }
              : c.destination === "GOAL"
                ? { goalId: destination.id }
                : { experimentId: destination.id },
            "LINKED",
          );
          result = {
            id: c.ideaId,
            ideaId: c.ideaId,
            href: `/direction/ideas/${c.ideaId}`,
          };
        }
      } else if (c.type === "SAVE_IDEA" || c.type === "ARCHIVE_IDEA") {
        if (c.id) await lockDirection(tx, userId, `idea:${c.id}`);
        const old = c.id
          ? await tx.idea.findFirst({ where: { id: c.id, userId } })
          : null;
        if (c.id && !old)
          throw new DirectionError("Idea not found.", undefined, 404);
        if (old) requireVersion(old.version, c.expectedVersion);
        if (c.type === "SAVE_IDEA" && old?.archivedAt)
          throw new DirectionError("Restore this idea before editing it.");
        const row =
          c.type === "SAVE_IDEA"
            ? old
              ? await tx.idea.update({
                  where: { id: old.id },
                  data: {
                    title: c.draft.title,
                    notes: c.draft.notes,
                    version: { increment: 1 },
                  },
                })
              : await tx.idea.create({
                  data: { userId, title: c.draft.title, notes: c.draft.notes },
                })
            : await tx.idea.update({
                where: { id: c.id },
                data: {
                  archivedAt: c.archived ? new Date() : null,
                  version: { increment: 1 },
                },
              });
        if (c.type === "SAVE_IDEA") {
          const ids = [...new Set(c.draft.domainIds)];
          if (
            (await tx.domain.count({ where: { userId, id: { in: ids } } })) !==
            ids.length
          )
            throw new DirectionError("Choose your own domains.", "domainIds");
          await tx.ideaDomain.deleteMany({ where: { userId, ideaId: row.id } });
          await tx.ideaDomain.createMany({
            data: ids.map((domainId) => ({ userId, ideaId: row.id, domainId })),
          });
        }
        await tx.ideaChange.create({
          data: {
            userId,
            ideaId: row.id,
            kind:
              c.type === "SAVE_IDEA"
                ? old
                  ? "EDITED"
                  : "CREATED"
                : c.archived
                  ? "ARCHIVED"
                  : "RESTORED",
            snapshot: jsonValue(
              c.type === "SAVE_IDEA" ? c.draft : { archived: c.archived },
            ),
          },
        });
        result = {
          id: row.id,
          version: row.version,
          ideaId: row.id,
          href: `/direction/ideas/${row.id}`,
        };
      } else {
        if (c.id) await lockDirection(tx, userId, `decision:${c.id}`);
        const old = c.id
          ? await tx.decision.findFirst({ where: { id: c.id, userId } })
          : null;
        if (c.id && !old)
          throw new DirectionError("Decision not found.", undefined, 404);
        if (c.type !== "REFLECT_DECISION" && old)
          requireVersion(old.version, c.expectedVersion);
        let id: string, version: number;
        const today = DateTime.now().setZone("Europe/Amsterdam").toISODate()!;
        if (c.type === "SAVE_DECISION") {
          if (c.draft.decidedOn > today)
            throw new DirectionError(
              "Record a decision after making it.",
              "decidedOn",
            );
          if (old?.archivedAt)
            throw new DirectionError(
              "Restore this decision before editing it.",
            );
          if (old && c.supersedesId && c.supersedesId !== old.supersedesId)
            throw new DirectionError("A decision's lineage cannot change.");
          await validateDecisionContext(tx, userId, c.draft);
          if (!old && c.supersedesId) {
            const superseded = await tx.decision.findFirst({
              where: { userId, id: c.supersedesId, supersededBy: { none: {} } },
            });
            if (!superseded)
              throw new DirectionError(
                "Choose a current decision you own to supersede.",
              );
          }
          const data = {
            ...c.draft,
            decidedOn: storedDate(c.draft.decidedOn),
            reviewOn: c.draft.reviewOn ? storedDate(c.draft.reviewOn) : null,
            contentId: c.draft.contentId ?? null,
            projectId: c.draft.projectId ?? null,
            goalId: c.draft.goalId ?? null,
            experimentId: c.draft.experimentId ?? null,
            nicheId: c.draft.nicheId ?? null,
            seasonId: c.draft.seasonId ?? null,
          };
          const row = old
            ? await tx.decision.update({
                where: { id: old.id },
                data: { ...data, version: { increment: 1 } },
              })
            : await tx.decision.create({
                data: { ...data, userId, supersedesId: c.supersedesId },
              });
          await tx.decisionChange.create({
            data: {
              userId,
              decisionId: row.id,
              version: row.version,
              reason:
                c.changeReason ||
                (old
                  ? "Note edited; previous wording retained."
                  : "Original choice and reasoning."),
              snapshot: jsonValue(row),
            },
          });
          id = row.id;
          version = row.version;
        } else if (c.type === "ARCHIVE_DECISION") {
          const row = await tx.decision.update({
            where: { id: c.id },
            data: {
              archivedAt: c.archived ? new Date() : null,
              version: { increment: 1 },
            },
          });
          id = row.id;
          version = row.version;
          await tx.decisionChange.create({
            data: {
              userId,
              decisionId: id,
              version,
              reason: c.archived ? "Archived locally." : "Restored locally.",
              snapshot: jsonValue(row),
            },
          });
        } else {
          if (old!.archivedAt)
            throw new DirectionError(
              "Restore this decision before adding a reflection.",
            );
          if (
            c.reflectedOn > today ||
            c.reflectedOn < old!.decidedOn.toISOString().slice(0, 10)
          )
            throw new DirectionError(
              "Choose a reflection date between the decision and today.",
              "reflectedOn",
            );
          await tx.decisionReflection.create({
            data: {
              userId,
              decisionId: c.id,
              assessment: c.assessment,
              reflection: c.reflection,
              reflectedOn: storedDate(c.reflectedOn),
            },
          });
          id = c.id;
          version = old!.version;
        }
        result = {
          id,
          version,
          decisionId: id,
          href: `/direction/decisions/${id}`,
        };
      }
      await tx.thinkingMutation.create({
        data: {
          userId,
          operationKey: c.operationKey,
          fingerprint: hash,
          result: jsonValue(result),
        },
      });
      return result;
    },
    { timeout: 15000 },
  );
}
