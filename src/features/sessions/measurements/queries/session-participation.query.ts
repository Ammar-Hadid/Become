import { Prisma } from "@/generated/prisma/client";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";

/** Calendar participation follows focused contributions, including sessions crossing quarters. */
export function participatedSessionSeasonsSql(
  userId: string,
  before: Date,
  at: Date,
) {
  const start = Prisma.sql`(q.local_start AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC'`;
  const end = Prisma.sql`LEAST(((q.local_start + interval '3 months') AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC',${before})`;
  return Prisma.sql`SELECT q.local_start::date AS start_on FROM session s CROSS JOIN LATERAL generate_series(date_trunc('quarter',(s."startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Amsterdam'),date_trunc('quarter',(LEAST(s."endedAt",${before}) AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Amsterdam'),interval '3 months') AS q(local_start) WHERE s."userId"=${userId} AND s."endedAt" IS NOT NULL AND s."startedAt"<${before} AND ${start}<${before} AND ${sessionFocusedSecondsSql("s", { start, end }, at)}>0`;
}
