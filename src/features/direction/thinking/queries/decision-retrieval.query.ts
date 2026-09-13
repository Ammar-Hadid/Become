import { Prisma } from "@/generated/prisma/client";
import {
  DirectionError,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { boundedExcerpt } from "@/features/reviews/facts/utils/review-payload.util";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  decodeEvidenceCursor,
  evidenceCursor,
} from "@/features/reviews/facts/queries/review-sources.query";
import type { TargetedRetrievalRequest } from "@/features/reviews/retrieval/schemas/retrieval.schema";
import type {
  RetrievalEvent,
  TargetedRetrieval,
} from "@/features/reviews/retrieval/types/retrieval.types";

type DetailQuery = Extract<TargetedRetrievalRequest, { type: "DECISION" }>;
export async function readDecisionRetrieval(
  tx: DirectionTx,
  userId: string,
  c: DetailQuery,
) {
  const row = await tx.decision.findFirst({
    where: { id: c.id, userId },
    select: {
      id: true,
      version: true,
      choice: true,
      reason: true,
      context: true,
      alternatives: true,
      expectedOutcome: true,
      reconsiderWhen: true,
      reviewOn: true,
      decidedOn: true,
      supersedesId: true,
      supersededBy: {
        select: { id: true, choice: true, reason: true },
        take: 1,
      },
    },
  });
  if (!row) throw new DirectionError("Decision not found.", undefined, 404);
  const cursor = decodeEvidenceCursor(c.cursor);
  const table =
    c.section === "changes"
      ? Prisma.sql`direction_decision_change`
      : Prisma.sql`direction_decision_reflection`;
  const projection =
    c.section === "changes"
      ? Prisma.sql`reason,jsonb_build_object('choice',LEFT(snapshot->>'choice',1200),'reason',LEFT(snapshot->>'reason',1200),'context',LEFT(snapshot->>'context',1200)) AS details`
      : Prisma.sql`reflection AS reason,jsonb_build_object('assessment',assessment,'reflectedOn',"reflectedOn") AS details`;
  const counts = await tx.$queryRaw<{ count: number; hash: string }[]>(
    Prisma.sql`SELECT COUNT(*)::int AS count,md5(COALESCE(string_agg(to_jsonb(h)::text,',' ORDER BY h.id),'')) AS hash FROM ${table} h WHERE "userId"=${userId} AND "decisionId"=${row.id}`,
  );
  const events = await tx.$queryRaw<
    {
      id: string;
      createdAt: Date;
      reason: string;
      details: Record<string, string | null>;
    }[]
  >(
    Prisma.sql`SELECT id,"createdAt",${projection} FROM ${table} WHERE "userId"=${userId} AND "decisionId"=${row.id} ${cursor ? Prisma.sql`AND ("createdAt",id)<(${cursor.at},${cursor.key})` : Prisma.empty} ORDER BY "createdAt" DESC,id DESC LIMIT 11`,
  );
  const history: RetrievalEvent[] = events
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      kind: c.section,
      at: e.createdAt.toISOString(),
      reason: boundedExcerpt(e.reason, 1800),
      details: Object.fromEntries(
        Object.entries(e.details).map(([k, v]) => [
          k,
          v === null ? null : boundedExcerpt(String(v), 1200),
        ]),
      ),
      truncated: Buffer.byteLength(e.reason, "utf8") > 1800,
    }));
  const record: TargetedRetrieval["records"][number] = {
    id: row.id,
    kind: "DECISION",
    href: `/direction/decisions/${row.id}`,
    fields: {
      choice: boundedExcerpt(row.choice, 1800),
      reason: boundedExcerpt(row.reason, 2400),
      context: boundedExcerpt(row.context, 1200),
      alternatives: boundedExcerpt(row.alternatives, 1200),
      expectedOutcome: boundedExcerpt(row.expectedOutcome, 1200),
      reconsiderWhen: boundedExcerpt(row.reconsiderWhen, 1200),
      decidedOn: row.decidedOn.toISOString().slice(0, 10),
      reviewOn: row.reviewOn?.toISOString().slice(0, 10) ?? null,
      supersedesId: row.supersedesId,
      supersededById: row.supersededBy[0]?.id ?? null,
      supersedingReason: row.supersededBy[0]
        ? boundedExcerpt(row.supersededBy[0].reason, 1800)
        : null,
    },
    events: history,
  };
  return {
    record,
    total: counts[0].count,
    fingerprint: reviewFingerprint({
      row,
      section: c.section,
      historyHash: counts[0].hash,
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
