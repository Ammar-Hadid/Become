import { Prisma } from "@/generated/prisma/client";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  goalDraftSchema,
  experimentDraftSchema,
} from "@/features/direction/schemas/direction.schema";
import { evaluateDirection } from "@/features/direction/measurements/services/criterion-evaluation.service";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import type {
  ReviewIntention,
  ReviewPeriod,
} from "@/features/reviews/contracts/types/review.types";
import type { CriterionDraft } from "@/features/direction/types/direction.types";
type Row = {
  id: string;
  kind: "GOAL" | "EXPERIMENT";
  title: string;
  description: string;
  original: unknown;
  originalAt: Date | null;
  ending: unknown;
  endState: string | null;
  conclusion: string | null;
  changes: unknown;
  count: number;
};
export async function readReviewIntentions(
  tx: DirectionTx,
  userId: string,
  period: ReviewPeriod,
) {
  const start = new Date(period.start),
    end = new Date(period.evaluatedThrough);
  const query = (goal: boolean) => {
    const table = goal ? Prisma.sql`direction_goal` : Prisma.sql`experiment`,
      history = goal ? Prisma.sql`goal_change` : Prisma.sql`experiment_change`,
      fk = goal ? Prisma.sql`h."goalId"` : Prisma.sql`h."experimentId"`;
    return Prisma.sql`SELECT r.id,${goal ? "GOAL" : "EXPERIMENT"}::text AS kind,r.title,${goal ? Prisma.sql`r.description` : Prisma.sql`r.question`} AS description,COALESCE(original.snapshot,first_draft.snapshot)->'draft' AS original,COALESCE(original."createdAt",first_draft."createdAt") AS "originalAt",ending.snapshot->'draft' AS ending,state.kind AS "endState",CASE WHEN state.kind='CONCLUDE' THEN state.reason ELSE NULL END AS conclusion,COALESCE(events.items,'[]'::jsonb) AS changes FROM ${table} r LEFT JOIN LATERAL (SELECT h.snapshot,h."createdAt" FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h.snapshot ? 'draft' AND h."createdAt"<=${start} ORDER BY h."createdAt" DESC,h.version DESC LIMIT 1) original ON true LEFT JOIN LATERAL (SELECT h.snapshot,h."createdAt" FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h.snapshot ? 'draft' AND h."createdAt"<${end} ORDER BY h."createdAt",h.version LIMIT 1) first_draft ON true LEFT JOIN LATERAL (SELECT h.snapshot FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h.snapshot ? 'draft' AND h."createdAt"<${end} ORDER BY h."createdAt" DESC,h.version DESC LIMIT 1) ending ON true LEFT JOIN LATERAL (SELECT h.kind,h.reason FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h.kind IN ('CREATED','REPEATED','PAUSE','RESUME','CONCLUDE','REOPEN') AND h."createdAt"<${end} ORDER BY h."createdAt" DESC,h.version DESC LIMIT 1) state ON true LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',e.id,'occurredAt',e."createdAt",'reason',LEFT(e.reason,500)) ORDER BY e."createdAt") AS items FROM (SELECT h.id,h."createdAt",h.reason FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h."createdAt">=${start} AND h."createdAt"<${end} ORDER BY h."createdAt" DESC,h.version DESC LIMIT 4) e) events ON true WHERE r."userId"=${userId} AND r."createdAt"<${end} AND COALESCE(COALESCE(original.snapshot,first_draft.snapshot)->'draft'->>'startOn',r."startOn"::text)<=${period.endOn} AND (state.kind IS DISTINCT FROM 'CONCLUDE' OR EXISTS (SELECT 1 FROM ${history} h WHERE ${fk}=r.id AND h."userId"=${userId} AND h."createdAt">=${start} AND h."createdAt"<${end}))`;
  };
  const rows = await tx.$queryRaw<Row[]>(
    Prisma.sql`WITH intentions AS ((${query(true)}) UNION ALL (${query(false)})) SELECT *,COUNT(*) OVER()::int AS count FROM intentions ORDER BY ("endState" IS DISTINCT FROM 'CONCLUDE') DESC,id LIMIT 9`,
  );
  const selected = rows.slice(0, 8),
    result: ReviewIntention[] = [];
  // Explicit evaluation limit bounds source qualification fan-out; more intentions remain retrievable.
  let remainingCriteria = 24;
  for (const row of selected) {
    const schema =
      row.kind === "GOAL" ? goalDraftSchema : experimentDraftSchema;
    const ending = schema.safeParse(row.ending),
      original = schema.safeParse(row.original);
    let progress =
        "Historical criterion definition unavailable; inspect the source.",
      criteriaReached: boolean | null = null;
    if (ending.success) {
      const draft = ending.data;
      if (draft.criteria.length <= remainingCriteria) {
        remainingCriteria -= draft.criteria.length;
        // Historical manual assessments need original criterion IDs; source snapshots do not always retain them.
        const criteria = draft.criteria as CriterionDraft[];
        const historicalUnsafe =
          period.state === "ENDED" &&
          criteria.some((c) =>
            [
              "MANUAL",
              "SAVINGS_GOAL",
              "ENGINEERING_PROJECT_COMPLETED",
              "NEW_RECURRING_COMPANY",
            ].includes(c.metric),
          );
        if (historicalUnsafe)
          progress =
            "Historical status requires the dated source assessment; current values are not projected backward.";
        else {
          const e = await evaluateDirection(
            tx,
            userId,
            criteria,
            { startOn: draft.startOn, targetOn: draft.targetOn },
            draft.criterionMode,
            new Date(end.getTime() - 1),
            "sourceInteractionIds" in draft
              ? draft.sourceInteractionIds
              : undefined,
            "sourceContentIds" in draft ? draft.sourceContentIds : undefined,
          );
          progress = e.progressSummary;
          criteriaReached = e.criteriaMet;
        }
      } else
        progress =
          "Detailed criterion evaluation is available from the source; omitted from this bounded review packet.";
    }
    const getDescription = (
      d:
        z.infer<typeof goalDraftSchema> | z.infer<typeof experimentDraftSchema>,
    ) => ("question" in d ? d.question : (d.description ?? ""));
    result.push({
      id: row.id,
      kind: row.kind,
      title: (ending.success ? ending.data.title : row.title).slice(0, 240),
      href: `/direction/${row.kind === "GOAL" ? "goals" : "experiments"}/${row.id}`,
      original: original.success
        ? getDescription(original.data).slice(0, 1200)
        : null,
      originalRecordedAt: row.originalAt?.toISOString() ?? null,
      originalTarget: original.success
        ? original.data.criteria
            .map((c) => `${c.label || c.metric}: ${c.target}`)
            .join(" · ")
            .slice(0, 1000) || null
        : null,
      current: ending.success
        ? getDescription(ending.data).slice(0, 1200)
        : "Current source detail is available; no historical wording is asserted.",
      status:
        row.endState === "CONCLUDE"
          ? "CONCLUDED"
          : row.endState === "PAUSE"
            ? "PAUSED"
            : row.endState
              ? "ACTIVE"
              : "UNKNOWN",
      conclusion: row.conclusion?.slice(0, 1200) ?? null,
      changes: Array.isArray(row.changes)
        ? row.changes.map(
            (v: { id: string; occurredAt: string; reason: string }) => ({
              ...v,
              occurredAt: DateTime.fromISO(v.occurredAt, {
                zone: "utc",
              }).toISO()!,
            }),
          )
        : [],
      historyCoverage: row.originalAt
        ? row.originalAt > start
          ? "First saved during this period; no earlier intent is asserted."
          : "Saved intention at the start of this period. Progress uses the last saved definition within it and evidence available now."
        : "No recoverable saved intention for this period.",
      progress,
      criteriaReached,
    });
  }
  return {
    items: result,
    omitted: Math.max(0, (rows[0]?.count ?? 0) - selected.length),
  };
}
