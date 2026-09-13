import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const thinkingReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "ideas.captured",
      domain: "ideas",
      label: "Ideas saved",
      unit: "count",
      qualification:
        "Ideas created in this period. No importance score or required capture quota.",
      moment: false,
    },
    {
      key: "ideas.promoted",
      domain: "ideas",
      label: "Ideas connected to work",
      unit: "count",
      qualification:
        "Explicit origin links to canonical Content, Goals or Experiments. These links do not prove completion.",
      moment: true,
    },
    {
      key: "decisions.made",
      domain: "decisions",
      label: "Decisions recorded",
      unit: "count",
      qualification:
        "User-authored choices on their chosen decision date, preserving the recorded reasoning and supersession history.",
      moment: true,
    },
    {
      key: "decisions.reflections",
      domain: "decisions",
      label: "Decision reflections",
      unit: "count",
      qualification:
        "Dated user assessments of a choice. Helpful or unhelpful remains the user's judgment, not an objective correctness score.",
      moment: true,
    },
  ],
  sql: (s) => Prisma.sql`
    SELECT 'ideas.captured'::text AS "metricKey",'IDEA'::text AS kind,i.id,i.version::text AS revision,i.title AS label,LEFT(i.notes,800) AS excerpt,i."createdAt" AS "occurredAt",'/direction/ideas/'||i.id AS href,'1'::text AS value,NULL::text AS currency,NULL::text AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(i.notes)>800 AS truncated FROM direction_idea i WHERE i."userId"=${s.userId} AND i."createdAt">=${s.start} AND i."createdAt"<${s.end}
    UNION ALL
    SELECT 'ideas.promoted','IDEA_OUTPUT',o.id,o.id,i.title,'Linked to '||o.kind,o."createdAt",CASE WHEN o."contentId" IS NOT NULL THEN '/content/'||o."contentId" WHEN o."goalId" IS NOT NULL THEN '/direction/goals/'||o."goalId" ELSE '/direction/experiments/'||o."experimentId" END,'1',NULL,o.kind,NULL,'FACT',false FROM direction_idea_output o JOIN direction_idea i ON i.id=o."ideaId" AND i."userId"=o."userId" WHERE o."userId"=${s.userId} AND o."createdAt">=${s.start} AND o."createdAt"<${s.end}
    UNION ALL
    SELECT 'decisions.made','DECISION',d.id,d.version::text,d.choice,LEFT(d.reason,800),(d."decidedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC','/direction/decisions/'||d.id,'1',NULL,NULL,NULL,'USER_JUDGMENT',LENGTH(d.reason)>800 FROM direction_decision d WHERE d."userId"=${s.userId} AND d."decidedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'>=${s.start} AND d."decidedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'<${s.end}
    UNION ALL
    SELECT 'decisions.reflections','DECISION_REFLECTION',r.id,r.id,d.choice,LEFT(r.assessment||' · '||r.reflection,800),(r."reflectedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC','/direction/decisions/'||d.id,'1',NULL,r.assessment,NULL,'USER_JUDGMENT',LENGTH(r.reflection)>750 FROM direction_decision_reflection r JOIN direction_decision d ON d.id=r."decisionId" AND d."userId"=r."userId" WHERE r."userId"=${s.userId} AND r."reflectedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'>=${s.start} AND r."reflectedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'<${s.end}`,
};
