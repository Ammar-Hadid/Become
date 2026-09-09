import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { operationKey } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  retryDirectionTransaction,
} from "@/features/direction/services/direction-mutation.service";
import {
  getGoalView,
  getExperimentView,
} from "@/features/direction/queries/direction.query";
const command = z.object({
  kind: z.enum(["GOAL", "EXPERIMENT"]),
  id: z.string(),
  expectedVersion: z.number().int(),
  operationKey,
  action: z.enum([
    "PAUSE",
    "RESUME",
    "CONCLUDE",
    "REOPEN",
    "ARCHIVE",
    "RESTORE",
  ]),
  reason: z.string().trim().min(1, "Record why this changed.").max(6000),
  outcome: z
    .enum([
      "ACHIEVED",
      "PARTIAL",
      "STOPPED",
      "SUPPORTED",
      "NOT_SUPPORTED",
      "INCONCLUSIVE",
    ])
    .optional(),
  result: z.string().trim().max(6000).optional(),
  learning: z.string().trim().max(6000).optional(),
  previewFingerprint: z.string().optional(),
});
export async function changeDirectionLifecycle(userId: string, input: unknown) {
  const c = command.parse(input),
    hash = fingerprint(c),
    isGoal = c.kind === "GOAL";
  return retryDirectionTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        await lockDirection(tx, userId, isGoal ? "goals" : "experiments");
        const prior = isGoal
          ? await tx.goalChange.findUnique({
              where: {
                userId_operationKey: { userId, operationKey: c.operationKey },
              },
            })
          : await tx.experimentChange.findUnique({
              where: {
                userId_operationKey: { userId, operationKey: c.operationKey },
              },
            });
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This submission was already saved with different values.",
            );
          return { id: c.id, version: prior.version };
        }
        const row = isGoal
          ? await getGoalView(userId, c.id, tx)
          : await getExperimentView(userId, c.id, tx);
        if (!row) throw new DirectionError("Record not found.");
        requireVersion(row.version, c.expectedVersion);
        const data: {
          version: { increment: number };
          status?: string;
          outcome?: string | null;
          conclusion?: string | null;
          concludedAt?: Date | null;
          conclusionSnapshot?: ReturnType<typeof jsonValue>;
          result?: string | null;
          learning?: string | null;
          archivedAt?: Date | null;
        } = { version: { increment: 1 } };
        if (c.action === "PAUSE") {
          if (row.status !== "ACTIVE")
            throw new DirectionError("Only an active intention can be paused.");
          data.status = "PAUSED";
        }
        if (c.action === "RESUME") {
          if (row.status !== "PAUSED")
            throw new DirectionError("Only a paused intention can be resumed.");
          data.status = "ACTIVE";
        }
        if (c.action === "ARCHIVE") {
          if (row.archivedAt) throw new DirectionError("Already archived.");
          data.archivedAt = new Date();
        }
        if (c.action === "RESTORE") {
          if (!row.archivedAt)
            throw new DirectionError("This record is not archived.");
          data.archivedAt = null;
        }
        if (c.action === "REOPEN") {
          if (row.status !== "CONCLUDED")
            throw new DirectionError(
              "Only a concluded intention can be reopened.",
            );
          data.status = "ACTIVE";
          data.outcome = null;
          data.concludedAt = null;
          // The previous conclusion remains in the immutable change record and snapshot.
          if (isGoal) data.conclusion = null;
          else {
            data.result = null;
            data.learning = null;
          }
        }
        if (c.action === "CONCLUDE") {
          if (row.status === "CONCLUDED")
            throw new DirectionError("This intention is already concluded.");
          if (c.previewFingerprint !== row.evaluation.fingerprint)
            throw new DirectionError(
              "Evidence changed since your preview. Review the current evidence before concluding.",
              "previewFingerprint",
            );
          if (
            !c.outcome ||
            !(
              isGoal
                ? ["ACHIEVED", "PARTIAL", "STOPPED"]
                : ["SUPPORTED", "NOT_SUPPORTED", "INCONCLUSIVE"]
            ).includes(c.outcome)
          )
            throw new DirectionError(
              "Choose the conclusion for this intention.",
              "outcome",
            );
          if (
            c.outcome === "ACHIEVED" &&
            row.criteria.length &&
            row.evaluation.criteriaMet !== true
          )
            throw new DirectionError(
              "The required criteria have not been established. Review them or choose a partial/stopped conclusion.",
              "outcome",
            );
          if (!isGoal && (!c.result || !c.learning))
            throw new DirectionError(
              "Record both the result and what you learned.",
              !c.result ? "result" : "learning",
            );
          data.status = "CONCLUDED";
          data.outcome = c.outcome;
          data.concludedAt = new Date();
          data.conclusionSnapshot = jsonValue(row.evaluation);
          if (isGoal) data.conclusion = c.reason;
          else {
            data.result = c.result;
            data.learning = c.learning;
          }
        }
        if (isGoal) {
          const updated = await tx.goal.update({ where: { id: c.id }, data });
          await tx.goalChange.create({
            data: {
              userId,
              goalId: c.id,
              version: updated.version,
              operationKey: c.operationKey,
              fingerprint: hash,
              kind: c.action,
              reason: c.reason,
              snapshot: jsonValue({
                before: {
                  status: row.status,
                  outcome: row.outcome,
                  evaluation: row.conclusionSnapshot,
                },
                command: c,
                evaluation: row.evaluation,
              }),
            },
          });
          return { id: c.id, version: updated.version };
        }
        const updated = await tx.experiment.update({
          where: { id: c.id },
          data,
        });
        await tx.experimentChange.create({
          data: {
            userId,
            experimentId: c.id,
            version: updated.version,
            operationKey: c.operationKey,
            fingerprint: hash,
            kind: c.action,
            reason: c.reason,
            snapshot: jsonValue({
              before: {
                status: row.status,
                outcome: row.outcome,
                evaluation: row.conclusionSnapshot,
              },
              command: c,
              evaluation: row.evaluation,
            }),
          },
        });
        return { id: c.id, version: updated.version };
      },
      { isolationLevel: "Serializable", timeout: 20000 },
    ),
  );
}
