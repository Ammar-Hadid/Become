import { businessReviewAudienceSql } from "@/features/entrepreneurship/measurements/queries/business-review-audience.query";
import { Prisma } from "@/generated/prisma/client";
import { sessionReviewProvider } from "@/features/sessions/measurements/queries/session-review.query";
import { engineeringReviewProvider } from "@/features/engineering/measurements/queries/engineering-review.query";
import { financeReviewProvider } from "@/features/finance/measurements/queries/finance-review.query";
import { businessReviewProvider } from "@/features/entrepreneurship/measurements/queries/business-review.query";
import { contentReviewProvider } from "@/features/content/measurements/queries/content-review.query";
import { thinkingReviewProvider } from "@/features/direction/thinking/queries/thinking-review.query";
import { directionReviewProvider } from "@/features/direction/measurements/queries/direction-review.query";
import type { ReviewReadScope } from "@/features/reviews/facts/types/review-source.types";
import type {
  ReviewDomain,
  ReviewSource,
} from "@/features/reviews/contracts/types/review.types";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
export const REVIEW_DOMAINS: ReviewDomain[] = [
  "sessions",
  "engineering",
  "finance",
  "entrepreneurship",
  "content",
  "direction",
  "ideas",
  "decisions",
];
export const reviewProviders = [
  sessionReviewProvider,
  engineeringReviewProvider,
  financeReviewProvider,
  businessReviewProvider,
  contentReviewProvider,
  thinkingReviewProvider,
  directionReviewProvider,
];
export const reviewDefinitions = reviewProviders.flatMap((p) => p.definitions);

/** Providers own qualification; this composition only normalizes their bounded evidence projection. */
export function reviewSourcesSql(
  scope: ReviewReadScope,
  domains = REVIEW_DOMAINS,
) {
  if (!domains.length || domains.some((d) => !REVIEW_DOMAINS.includes(d)))
    throw new Error("Choose at least one supported review domain.");
  const providers = reviewProviders.filter((p) =>
    p.definitions.some((d) => domains.includes(d.domain)),
  );
  const definitions = reviewDefinitions.filter((d) =>
    domains.includes(d.domain),
  );
  const defs = Prisma.join(
    definitions.map(
      (d) =>
        Prisma.sql`(${d.key},${d.unit},${d.qualification},${d.moment}::boolean)`,
    ),
  );
  return Prisma.sql`WITH raw_sources AS (${Prisma.join(
    providers.map((p) => Prisma.sql`(${p.sql(scope)})`),
    " UNION ALL ",
  )}), definitions("baseKey",unit,qualification,moment) AS (VALUES ${defs}) SELECT r."metricKey"||COALESCE(':'||r.currency,'') AS "metricKey",r."metricKey"||COALESCE(':'||r.currency,'')||':'||r.kind||':'||r.id AS key,r.kind,r.id,r.revision,LEFT(r.label,240) AS label,r.excerpt,r."occurredAt",r.href,r.value,d.unit,r.currency,r.dimension,r."imageHref",r.meaning,(r.truncated OR LENGTH(r.label)>240) AS truncated,d.qualification,d.moment,${businessReviewAudienceSql(scope)} AS audience FROM raw_sources r JOIN definitions d ON d."baseKey"=r."metricKey"`;
}
export type SourceRow = Omit<ReviewSource, "occurredAt"> & {
  occurredAt: Date;
  moment?: boolean;
};
export function reviewSource(row: SourceRow): ReviewSource {
  const { moment, ...source } = row;
  void moment;
  return { ...source, occurredAt: row.occurredAt.toISOString() };
}
export type MetricAggregate = {
  metricKey: string;
  currency: string | null;
  value: string;
  count: number;
  hash: string;
};
export async function readReviewAggregates(
  tx: DirectionTx,
  scope: ReviewReadScope,
  domains = REVIEW_DOMAINS,
) {
  return tx.$queryRaw<MetricAggregate[]>(
    Prisma.sql`WITH sources AS (${reviewSourcesSql(scope, domains)}) SELECT "metricKey",currency,SUM(value::numeric)::text AS value,COUNT(*)::int AS count,md5(string_agg(key||':'||revision||':'||value||':'||label||':'||excerpt||':'||"occurredAt"::text||':'||COALESCE(dimension,'')||':'||COALESCE("imageHref",'')||':'||COALESCE(audience::text,''),',' ORDER BY key)) AS hash FROM sources GROUP BY "metricKey",currency ORDER BY "metricKey"`,
  );
}
export async function readReviewMoments(
  tx: DirectionTx,
  scope: ReviewReadScope,
  domains: ReviewDomain[],
  selected: string[],
) {
  return tx.$queryRaw<SourceRow[]>(
    Prisma.sql`WITH sources AS (${reviewSourcesSql(scope, domains)}), ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY "metricKey" ORDER BY "occurredAt" DESC,key DESC) AS rank FROM sources WHERE moment OR key IN (${selected.length ? Prisma.join(selected) : Prisma.sql`NULL`})) SELECT "metricKey",key,kind,id,revision,label,excerpt,"occurredAt",href,value,unit,currency,dimension,"imageHref",meaning,truncated,qualification,moment,audience FROM ranked WHERE rank<=3 OR key IN (${selected.length ? Prisma.join(selected) : Prisma.sql`NULL`}) ORDER BY (key IN (${selected.length ? Prisma.join(selected) : Prisma.sql`NULL`})) DESC NULLS LAST,"occurredAt" DESC,key DESC LIMIT 60`,
  );
}
export function evidenceCursor(row: { occurredAt: string; key: string }) {
  return Buffer.from(JSON.stringify([row.occurredAt, row.key])).toString(
    "base64url",
  );
}
export function decodeEvidenceCursor(
  cursor?: string | null,
): { at: Date; key: string } | null {
  if (!cursor) return null;
  try {
    if (cursor.length > 1500) throw Error();
    const value: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString(),
    );
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== "string" ||
      typeof value[1] !== "string" ||
      value[1].length > 500 ||
      !Number.isFinite(Date.parse(value[0]))
    )
      throw Error();
    return { at: new Date(value[0]), key: value[1] };
  } catch {
    throw new Error("Invalid evidence cursor");
  }
}
