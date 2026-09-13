import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const engineeringReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "engineering.evidence",
      domain: "engineering",
      label: "Builds and discoveries recorded",
      unit: "count",
      qualification:
        "Dated Engineering evidence: features, fixes, concepts, deployments and discoveries explicitly recorded by you. Session time alone does not produce an output.",
      moment: true,
    },
  ],
  sql: (s) =>
    Prisma.sql`SELECT 'engineering.evidence'::text AS "metricKey",'ENGINEERING_EVIDENCE'::text AS kind,e.id,e."updatedAt"::text AS revision,e.title AS label,LEFT(COALESCE(e.details,''),800) AS excerpt,e."occurredAt",'/engineering/evidence/'||e.id||'/edit' AS href,'1'::text AS value,NULL::text AS currency,e.type::text AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(e.details,''))>800 AS truncated FROM engineering_evidence e WHERE e."userId"=${s.userId} AND e."occurredAt">=${s.start} AND e."occurredAt"<${s.end}`,
};
