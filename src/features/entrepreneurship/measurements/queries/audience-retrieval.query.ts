import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import type { TargetedRetrievalRequest } from "@/features/reviews/retrieval/schemas/retrieval.schema";
import {
  decodeEvidenceCursor,
  evidenceCursor,
  reviewSource,
  reviewSourcesSql,
  type SourceRow,
  type MetricAggregate,
} from "@/features/reviews/facts/queries/review-sources.query";

export async function readAudienceRetrieval(
  tx: DirectionTx,
  userId: string,
  c: Extract<
    TargetedRetrievalRequest,
    { type: "ENTREPRENEURSHIP_EVIDENCE" | "ENTREPRENEURSHIP_RECEIPTS" }
  >,
  start: Date,
  end: Date,
  at: Date,
) {
  for (const [kind, id] of [
    ["niche", c.nicheId],
    ["person", c.personId],
    ["company", c.companyId],
    ["segment", c.segmentId],
  ] as const) {
    if (!id) continue;
    const where = { id, userId };
    const owned =
      kind === "niche"
        ? await tx.niche.findFirst({ where, select: { id: true } })
        : kind === "person"
          ? await tx.person.findFirst({ where, select: { id: true } })
          : kind === "company"
            ? await tx.company.findFirst({ where, select: { id: true } })
            : await tx.audienceSegment.findFirst({
                where,
                select: { id: true },
              });
    if (!owned)
      throw new DirectionError("Audience scope not found.", undefined, 404);
  }
  const metric =
    c.type === "ENTREPRENEURSHIP_EVIDENCE"
      ? "entrepreneurship.evidence"
      : `entrepreneurship.receipts:${c.currency}`;
  const sources = Prisma.sql`SELECT * FROM (${reviewSourcesSql({ userId, start, end, at }, ["entrepreneurship"])}) s WHERE s."metricKey"=${metric}
    ${c.nicheId ? Prisma.sql`AND s.audience->'explorationIds' ? ${c.nicheId}` : Prisma.empty}
    ${c.personId ? Prisma.sql`AND s.audience->>'personId'=${c.personId}` : Prisma.empty}
    ${c.companyId ? Prisma.sql`AND s.audience->>'businessId'=${c.companyId}` : Prisma.empty}
    ${c.segmentId ? Prisma.sql`AND s.audience->'segments' @> ${JSON.stringify([{ id: c.segmentId }])}::jsonb` : Prisma.empty}
    ${c.marketType ? (c.marketType === "UNRECORDED" ? Prisma.sql`AND s.audience->>'classification'='NOT_RECORDED'` : Prisma.sql`AND s.audience->>'marketType'=${c.marketType}`) : Prisma.empty}`;
  const aggregates = await tx.$queryRaw<MetricAggregate[]>(
    Prisma.sql`SELECT "metricKey",currency,SUM(value::numeric)::text AS value,COUNT(*)::int AS count,md5(string_agg(key||':'||revision||':'||value||':'||label||':'||excerpt||':'||"occurredAt"::text||':'||COALESCE(audience::text,''),',' ORDER BY key)) AS hash FROM (${sources}) s GROUP BY "metricKey",currency`,
  );
  const cursor = decodeEvidenceCursor(c.cursor);
  const rows = await tx.$queryRaw<SourceRow[]>(
    Prisma.sql`SELECT * FROM (${sources}) s ${cursor ? Prisma.sql`WHERE ("occurredAt",key)<(${cursor.at},${cursor.key})` : Prisma.empty} ORDER BY "occurredAt" DESC,key DESC LIMIT 26`,
  );
  return {
    aggregates,
    sources: rows.slice(0, 25).map(reviewSource),
    total: aggregates[0]?.count ?? 0,
    nextCursor:
      rows.length > 25 ? evidenceCursor(reviewSource(rows[24])) : null,
  };
}
