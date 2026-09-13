import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import type { PeriodReviewFacts } from "@/features/reviews/contracts/types/review.types";
import type { PeriodBucket } from "@/lib/dates/utils/period.util";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";

/** Complete owned domain series, including recorded zero and disabled domains. */
export async function readSessionReviewDomainTime(
  tx: DirectionTx,
  userId: string,
  scope: { start: Date; end: Date },
  buckets: PeriodBucket[],
  at: Date,
): Promise<NonNullable<PeriodReviewFacts["time"]["domainBreakdown"]>> {
  const focused = sessionFocusedSecondsSql("s", scope, at);
  const bucketFocused = sessionFocusedSecondsSql(
    "s",
    {
      start: Prisma.sql`b.start_at`,
      end: Prisma.sql`LEAST(b.end_at,${scope.end})`,
    },
    at,
  );
  const rows = await tx.$queryRaw<
    {
      domainId: string;
      name: string;
      total: string;
      provisional: string;
      label: string;
      start: Date;
      end: Date;
      seconds: string;
    }[]
  >(Prisma.sql`
    WITH buckets(label,start_at,end_at) AS (
      VALUES ${Prisma.join(buckets.map((b) => Prisma.sql`(${b.label},${b.start.toJSDate()}::timestamp,${b.end.toJSDate()}::timestamp)`))}
    ), totals AS (
      SELECT d.id,d.name,d."sortOrder",
        COALESCE(SUM(${focused}) FILTER (WHERE s.id IS NOT NULL AND s."endedAt" IS NOT NULL),0) AS total,
        COALESCE(SUM(${focused}) FILTER (WHERE s.id IS NOT NULL AND s."endedAt" IS NULL),0) AS provisional
      FROM domain d LEFT JOIN session s ON s."domainId"=d.id AND s."userId"=d."userId"
        AND s."startedAt"<${scope.end} AND (s."endedAt" IS NULL OR s."endedAt">${scope.start})
      WHERE d."userId"=${userId} GROUP BY d.id,d.name,d."sortOrder"
    )
    SELECT d.id AS "domainId",d.name,d.total::text,d.provisional::text,
      b.label,b.start_at AS start,b.end_at AS end,
      COALESCE(SUM(${bucketFocused}) FILTER (WHERE s.id IS NOT NULL),0)::text AS seconds
    FROM totals d CROSS JOIN buckets b
    LEFT JOIN session s ON s."domainId"=d.id AND s."userId"=${userId}
      AND s."endedAt" IS NOT NULL AND s."startedAt"<LEAST(b.end_at,${scope.end}) AND s."endedAt">b.start_at
    GROUP BY d.id,d.name,d.total,d.provisional,d."sortOrder",b.label,b.start_at,b.end_at
    ORDER BY d."sortOrder",d.id,b.start_at
  `);
  const series = new Map<
    string,
    NonNullable<PeriodReviewFacts["time"]["domainBreakdown"]>["series"][number]
  >();
  for (const row of rows) {
    let domain = series.get(row.domainId);
    if (!domain) {
      domain = {
        domainId: row.domainId,
        label: row.name,
        seconds: Number(row.total),
        provisionalSeconds: Number(row.provisional),
        provisionalLabel: Number(row.provisional)
          ? "Unfinished session contribution, pause-aware and provisional; excluded from completed totals."
          : null,
        buckets: [],
      };
      series.set(row.domainId, domain);
    }
    domain.buckets.push({
      label: row.label,
      start: row.start.toISOString(),
      end: row.end.toISOString(),
      seconds: Number(row.seconds),
    });
  }
  return { version: 1, series: [...series.values()] };
}
