import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
export async function readSessionMeasurement(
  tx: DirectionTx,
  s: {
    userId: string;
    start: Date;
    end: Date;
    domainId?: string;
    activityTypeId?: string;
    projectId?: string;
    contentId?: string;
    contentIds?: string[];
    nicheId?: string;
    companyId?: string;
  },
  offset = 0,
) {
  const scope = Prisma.sql`${s.contentId ? Prisma.sql`"contentId"=${s.contentId} AND` : Prisma.empty} ${s.contentIds ? (s.contentIds.length ? Prisma.sql`"contentId" IN (${Prisma.join(s.contentIds)}) AND` : Prisma.sql`FALSE AND`) : Prisma.empty} "userId"=${s.userId} AND "endedAt" IS NOT NULL AND "startedAt"<${s.end} AND "endedAt">${s.start} ${s.domainId ? Prisma.sql`AND "domainId"=${s.domainId}` : Prisma.empty} ${s.activityTypeId ? Prisma.sql`AND "activityTypeId"=${s.activityTypeId}` : Prisma.empty} ${s.projectId ? Prisma.sql`AND "engineeringProjectId"=${s.projectId}` : Prisma.empty} ${s.nicheId ? Prisma.sql`AND "businessNicheId"=${s.nicheId}` : Prisma.empty} ${s.companyId ? Prisma.sql`AND "businessCompanyId"=${s.companyId}` : Prisma.empty}`;
  const seconds = Prisma.sql`GREATEST(0,FLOOR(EXTRACT(EPOCH FROM LEAST("endedAt",${s.end})-GREATEST("startedAt",${s.start}))))`;
  const [totals, rows] = await Promise.all([
    tx.$queryRaw<{ seconds: string; count: number; hash: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM(${seconds}),0)::text AS seconds,COUNT(*)::int AS count,md5(COALESCE(string_agg(id||':'||${seconds}::text,',' ORDER BY id),'')) AS hash FROM session WHERE ${scope}`,
    ),
    tx.$queryRaw<
      {
        id: string;
        description: string | null;
        startedAt: Date;
        seconds: string;
      }[]
    >(
      Prisma.sql`SELECT id,description,"startedAt",${seconds}::text AS seconds FROM session WHERE ${scope} ORDER BY "startedAt" DESC,id DESC LIMIT 25 OFFSET ${offset}`,
    ),
  ]);
  return { ...totals[0], rows };
}
