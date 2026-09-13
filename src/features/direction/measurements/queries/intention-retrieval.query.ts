import { Prisma } from "@/generated/prisma/client";
import {
  DirectionError,
  dateLabel,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import {
  criterionDraft,
  evaluateDirection,
} from "@/features/direction/measurements/services/criterion-evaluation.service";
import { boundedExcerpt } from "@/features/reviews/facts/utils/review-payload.util";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  decodeEvidenceCursor,
  evidenceCursor,
} from "@/features/reviews/facts/queries/review-sources.query";
import type { TargetedRetrieval } from "@/features/reviews/retrieval/types/retrieval.types";

export async function readIntentionRetrieval(
  tx: DirectionTx,
  userId: string,
  kind: "GOAL" | "EXPERIMENT",
  id: string,
  cursorValue: string | undefined,
  at: Date,
) {
  const row =
    kind === "GOAL"
      ? await tx.goal.findFirst({
          where: { id, userId },
          include: { criteria: { orderBy: { position: "asc" }, take: 8 } },
        })
      : await tx.experiment.findFirst({
          where: { id, userId },
          include: {
            criteria: { orderBy: { position: "asc" }, take: 8 },
            sources: { select: { interactionId: true }, take: 200 },
            contentSources: { select: { contentId: true }, take: 200 },
          },
        });
  if (!row) throw new DirectionError("Intention not found.", undefined, 404);
  const draft = row.criteria.map(criterionDraft);
  const evaluation = await evaluateDirection(
    tx,
    userId,
    draft,
    { startOn: dateLabel(row.startOn)!, targetOn: dateLabel(row.targetOn) },
    row.criterionMode as "ALL" | "ANY",
    at,
    "sources" in row ? row.sources.map((s) => s.interactionId) : undefined,
    "contentSources" in row
      ? row.contentSources.map((s) => s.contentId)
      : undefined,
  );
  const cursor = decodeEvidenceCursor(cursorValue),
    table =
      kind === "GOAL" ? Prisma.sql`goal_change` : Prisma.sql`experiment_change`,
    fk = kind === "GOAL" ? Prisma.sql`"goalId"` : Prisma.sql`"experimentId"`;
  const totals = await tx.$queryRaw<{ count: number; hash: string }[]>(
    Prisma.sql`SELECT COUNT(*)::int AS count,md5(COALESCE(string_agg(id||':'||version::text||':'||snapshot::text||':'||reason,',' ORDER BY id),'')) AS hash FROM ${table} WHERE "userId"=${userId} AND ${fk}=${id}`,
  );
  const events = await tx.$queryRaw<
    {
      id: string;
      kind: string;
      createdAt: Date;
      reason: string;
      title: string | null;
      outcome: string | null;
    }[]
  >(
    Prisma.sql`SELECT id,kind,"createdAt",LEFT(reason,1800) AS reason,LEFT(snapshot->'draft'->>'title',300) AS title,snapshot->'command'->>'outcome' AS outcome FROM ${table} WHERE "userId"=${userId} AND ${fk}=${id} ${cursor ? Prisma.sql`AND ("createdAt",id)<(${cursor.at},${cursor.key})` : Prisma.empty} ORDER BY "createdAt" DESC,id DESC LIMIT 11`,
  );
  const fields: Record<string, string | null> = {
    title: boundedExcerpt(row.title, 600),
    description: boundedExcerpt(
      "description" in row ? row.description : row.question,
      2400,
    ),
    startOn: dateLabel(row.startOn)!,
    targetOn: dateLabel(row.targetOn) ?? null,
    status: row.status,
    outcome: row.outcome,
    conclusion: boundedExcerpt(
      ("conclusion" in row ? row.conclusion : row.learning) ?? "",
      2400,
    ),
    criteriaReached:
      evaluation.criteriaMet === null ? null : String(evaluation.criteriaMet),
    progress: evaluation.progressSummary,
  };
  // These are qualified current readings, not user conclusions or historical targets.
  for (const [i, c] of evaluation.criteria.entries()) {
    fields[`criterion.${i}.id`] = c.id;
    fields[`criterion.${i}.label`] = boundedExcerpt(c.label, 300);
    fields[`criterion.${i}.value`] = c.value;
    fields[`criterion.${i}.target`] = c.target;
    fields[`criterion.${i}.unit`] = c.unit;
    fields[`criterion.${i}.currency`] = c.currency;
    fields[`criterion.${i}.availability`] = c.availability;
    fields[`criterion.${i}.qualification`] = boundedExcerpt(
      c.qualification,
      1500,
    );
    fields[`criterion.${i}.caveats`] = boundedExcerpt(
      [
        ...c.caveats,
        ...c.exclusions,
        ...c.conditions.map((x) => x.detail),
      ].join(" "),
      2400,
    );
    fields[`criterion.${i}.sourceCount`] = String(c.sourceCount);
    fields[`criterion.${i}.sourcesHref`] =
      `/api/direction/criteria/${c.id}/sources`;
  }
  const record: TargetedRetrieval["records"][number] = {
    id,
    kind,
    href: `/direction/${kind === "GOAL" ? "goals" : "experiments"}/${id}`,
    fields,
    events: events
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        kind: e.kind,
        at: e.createdAt.toISOString(),
        reason: boundedExcerpt(e.reason, 1800),
        details: { title: e.title, outcome: e.outcome },
        truncated: Buffer.byteLength(e.reason, "utf8") >= 1800,
      })),
  };
  return {
    record,
    total: totals[0].count,
    fingerprint: reviewFingerprint({
      version: row.version,
      criteria: evaluation.fingerprint,
      history: totals[0].hash,
      fields,
    }),
    nextCursor:
      events.length > 10
        ? evidenceCursor({
            occurredAt: events[9].createdAt.toISOString(),
            key: events[9].id,
          })
        : null,
  };
}
