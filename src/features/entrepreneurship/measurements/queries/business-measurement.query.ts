import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
export async function readConversationMeasurement(
  tx: DirectionTx,
  s: {
    userId: string;
    start: Date;
    end: Date;
    nicheId?: string;
    companyId?: string;
    personId?: string;
    segmentId?: string;
    marketType?: string;
    distinctCompanies: boolean;
    distinctPeople?: boolean;
    outreachIds?: string[];
  },
  offset = 0,
) {
  const scope = Prisma.sql`i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end}
 ${s.nicheId ? Prisma.sql`AND r."nicheId"=${s.nicheId}` : Prisma.empty} ${s.companyId ? Prisma.sql`AND r."companyId"=${s.companyId}` : Prisma.empty}
 ${s.personId ? Prisma.sql`AND (r."personId"=${s.personId} OR EXISTS(SELECT 1 FROM interaction_participant ip WHERE ip."interactionRevisionId"=r.id AND ip."userId"=${s.userId} AND ip."personId"=${s.personId}))` : Prisma.empty}
 ${s.segmentId ? Prisma.sql`AND EXISTS(SELECT 1 FROM audience_context_segment acs WHERE acs."audienceContextId"=r."audienceContextId" AND acs."segmentId"=${s.segmentId})` : Prisma.empty}
 ${s.marketType ? Prisma.sql`AND EXISTS(SELECT 1 FROM audience_context ac WHERE ac.id=r."audienceContextId" AND ac."marketType"=${s.marketType})` : Prisma.empty}
 ${s.distinctCompanies ? Prisma.sql`AND r."companyId" IS NOT NULL` : Prisma.empty}
 ${s.distinctPeople ? Prisma.sql`AND (r."personId" IS NOT NULL OR EXISTS(SELECT 1 FROM interaction_participant ip WHERE ip."interactionRevisionId"=r.id AND ip."userId"=${s.userId}))` : Prisma.empty}
 ${s.outreachIds ? Prisma.sql`AND EXISTS(SELECT 1 FROM interaction oi JOIN interaction_revision ort ON ort."interactionId"=oi.id AND ort.version=oi.version WHERE oi."userId"=${s.userId} AND oi.id IN (${s.outreachIds.length ? Prisma.join(s.outreachIds) : Prisma.sql`NULL`}) AND oi.id=r."respondsToInteractionId" AND oi."voidedAt" IS NULL AND ort.kind='OUTREACH_SENT' AND ort."companyId" IS NOT DISTINCT FROM r."companyId" AND ort."personId" IS NOT DISTINCT FROM r."personId" AND ort."nicheId" IS NOT DISTINCT FROM r."nicheId" AND ort."occurredAt">=${s.start} AND ort."occurredAt"<${s.end} AND ort."occurredAt"<=r."occurredAt")` : Prisma.empty}`;
  const base = Prisma.sql`SELECT i.id,r.id AS revision,r.version,r."companyId",r."personId",r.summary,r."companySnapshot",r."personSnapshot",r."occurredAt" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE ${scope}`;
  const [totals, rows] = await Promise.all([
    tx.$queryRaw<{ count: number; recordCount: number; hash: string }[]>(
      Prisma.sql`WITH base AS (${base}) SELECT ${s.distinctPeople ? Prisma.sql`(SELECT COUNT(DISTINCT pid)::int FROM (SELECT "personId" pid FROM base UNION SELECT ip."personId" FROM base b JOIN interaction_participant ip ON ip."interactionRevisionId"=b.revision AND ip."userId"=${s.userId}) people)` : s.distinctCompanies ? Prisma.sql`COUNT(DISTINCT "companyId")::int` : Prisma.sql`COUNT(*)::int`} AS count,COUNT(*)::int AS "recordCount",md5(COALESCE(string_agg(id||':'||version::text,',' ORDER BY id),'')) AS hash FROM base`,
    ),
    tx.$queryRaw<
      {
        id: string;
        summary: string;
        companySnapshot: string | null;
        personSnapshot: string | null;
        occurredAt: Date;
      }[]
    >(
      Prisma.sql`${base} ORDER BY r."occurredAt" DESC,i.id DESC LIMIT 25 OFFSET ${offset}`,
    ),
  ]);
  return { ...totals[0], rows };
}
export async function readRecurringCandidates(
  tx: DirectionTx,
  userId: string,
  currency: string,
  minimum: bigint,
  companyId?: string,
  offerRevisionId?: string,
  start?: Date,
  end?: Date,
) {
  return tx.offerRevision.findMany({
    where: {
      userId,
      companyId: { not: null },
      offer: { mode: "SPECIFIC" },
      ...(companyId ? { companyId } : {}),
      ...(offerRevisionId ? { id: offerRevisionId } : {}),
      priceBasis: "RECURRING",
      currency,
      priceMinor: { gte: minimum },
      intervalUnit: "MONTH",
      intervalCount: 1,
      events: {
        some: {
          kind: "ACCEPTED",
          retractedAt: null,
          ...(start && end ? { occurredAt: { gte: start, lt: end } } : {}),
        },
      },
    },
    include: {
      offer: { include: { company: true } },
      events: {
        where: { retractedAt: null },
        include: { interactionRevision: { include: { interaction: true } } },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { id: "asc" },
    take: 101,
  });
}
