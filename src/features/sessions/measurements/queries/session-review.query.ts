import { Prisma } from "@/generated/prisma/client";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const sessionReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "sessions.focused",
      domain: "sessions",
      label: "Recorded focused time",
      unit: "seconds",
      qualification:
        "Completed sessions, clipped to the reporting window with intersecting pauses subtracted. Recorded time is not proof of attention or effort quality.",
      moment: false,
    },
  ],
  sql: (s) => {
    const seconds = sessionFocusedSecondsSql("s", s, s.at);
    return Prisma.sql`SELECT 'sessions.focused'::text AS "metricKey",'SESSION'::text AS kind,s.id,md5(s."updatedAt"::text||':'||${seconds}::text||':'||COALESCE(s.description,'')||':'||COALESCE(s.outcome,'')) AS revision,COALESCE(NULLIF(s.description,''),a.name) AS label,LEFT(COALESCE(s.outcome,''),800) AS excerpt,GREATEST(s."startedAt",${s.start}) AS "occurredAt",'/sessions?session='||s.id AS href,${seconds}::text AS value,NULL::text AS currency,d.name AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(s.outcome,''))>800 AS truncated FROM session s JOIN domain d ON d.id=s."domainId" AND d."userId"=s."userId" JOIN activity_type a ON a.id=s."activityTypeId" WHERE s."userId"=${s.userId} AND s."endedAt" IS NOT NULL AND s."startedAt"<${s.end} AND s."endedAt">${s.start} ${s.domainId ? Prisma.sql`AND s."domainId"=${s.domainId}` : Prisma.empty} AND ${seconds}>0`;
  },
};
