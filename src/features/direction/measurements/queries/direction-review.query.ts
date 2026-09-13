import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const directionReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "direction.goals",
      domain: "direction",
      label: "Goal conclusions recorded",
      unit: "count",
      qualification:
        "Immutable Goal conclusion events recorded in this period, including conclusions later reopened. Criteria reached and user conclusions remain different facts.",
      moment: true,
    },
    {
      key: "direction.experiments",
      domain: "direction",
      label: "Experiment conclusions recorded",
      unit: "count",
      qualification:
        "The user's saved Experiment conclusion and learning. It does not establish causal attribution.",
      moment: true,
    },
  ],
  sql: (s) => Prisma.sql`
    SELECT 'direction.goals'::text AS "metricKey",'GOAL_CONCLUSION'::text AS kind,h.id,h.version::text AS revision,COALESCE(d.title,g.title) AS label,LEFT(COALESCE(h.snapshot->'command'->>'outcome','')||' · '||h.reason,800) AS excerpt,h."createdAt" AS "occurredAt",'/direction/goals/'||g.id AS href,'1'::text AS value,NULL::text AS currency,h.snapshot->'command'->>'outcome' AS dimension,NULL::text AS "imageHref",'USER_JUDGMENT'::text AS meaning,LENGTH(h.reason)>750 AS truncated FROM goal_change h JOIN direction_goal g ON g.id=h."goalId" AND g."userId"=h."userId" LEFT JOIN LATERAL (SELECT snapshot->'draft'->>'title' AS title FROM goal_change WHERE "goalId"=g.id AND "userId"=${s.userId} AND snapshot ? 'draft' AND "createdAt"<=h."createdAt" ORDER BY "createdAt" DESC,version DESC LIMIT 1) d ON true WHERE h."userId"=${s.userId} AND h.kind='CONCLUDE' AND h."createdAt">=${s.start} AND h."createdAt"<${s.end}
    UNION ALL
    SELECT 'direction.experiments','EXPERIMENT_CONCLUSION',h.id,h.version::text,COALESCE(d.title,e.title),LEFT(COALESCE(h.snapshot->'command'->>'outcome','')||' · '||COALESCE(h.snapshot->'command'->>'learning',h.reason),800),h."createdAt",'/direction/experiments/'||e.id,'1',NULL,h.snapshot->'command'->>'outcome',NULL,'USER_JUDGMENT',LENGTH(COALESCE(h.snapshot->'command'->>'learning',h.reason))>750 FROM experiment_change h JOIN experiment e ON e.id=h."experimentId" AND e."userId"=h."userId" LEFT JOIN LATERAL (SELECT snapshot->'draft'->>'title' AS title FROM experiment_change WHERE "experimentId"=e.id AND "userId"=${s.userId} AND snapshot ? 'draft' AND "createdAt"<=h."createdAt" ORDER BY "createdAt" DESC,version DESC LIMIT 1) d ON true WHERE h."userId"=${s.userId} AND h.kind='CONCLUDE' AND h."createdAt">=${s.start} AND h."createdAt"<${s.end}`,
};
