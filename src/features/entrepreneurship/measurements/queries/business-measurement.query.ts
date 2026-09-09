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
    distinctCompanies: boolean;
    outreachIds?: string[];
  },
  offset = 0,
) {
  const scope = Prisma.sql`i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end} ${s.nicheId ? Prisma.sql`AND r."nicheId"=${s.nicheId}` : Prisma.empty} ${s.companyId ? Prisma.sql`AND r."companyId"=${s.companyId}` : Prisma.empty} ${s.distinctCompanies ? Prisma.sql`AND r."companyId" IS NOT NULL` : Prisma.empty} ${s.outreachIds ? Prisma.sql`AND EXISTS (SELECT 1 FROM interaction oi JOIN interaction_revision ort ON ort."interactionId"=oi.id AND ort.version=oi.version WHERE oi."userId"=${s.userId} AND oi.id IN (${s.outreachIds.length ? Prisma.join(s.outreachIds) : Prisma.sql`NULL`}) AND oi.id=r."respondsToInteractionId" AND oi."voidedAt" IS NULL AND ort.kind='OUTREACH_SENT' AND ort."companyId"=r."companyId" AND ort."nicheId" IS NOT DISTINCT FROM r."nicheId" AND ort."occurredAt">=${s.start} AND ort."occurredAt"<${s.end} AND ort."occurredAt"<=r."occurredAt")` : Prisma.empty}`;
  const [totals, rows] = await Promise.all([
    tx.$queryRaw<{ count: number; recordCount: number; hash: string }[]>(
      Prisma.sql`SELECT ${s.distinctCompanies ? Prisma.sql`COUNT(DISTINCT r."companyId")` : Prisma.sql`COUNT(*)`}::int AS count,COUNT(*)::int AS "recordCount",md5(COALESCE(string_agg(i.id||':'||r.version::text,',' ORDER BY i.id),'')) AS hash FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE ${scope}`,
    ),
    tx.$queryRaw<
      {
        id: string;
        summary: string;
        companySnapshot: string | null;
        occurredAt: Date;
      }[]
    >(
      Prisma.sql`SELECT i.id,r.summary,r."companySnapshot",r."occurredAt" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE ${scope} ORDER BY r."occurredAt" DESC,i.id DESC LIMIT 25 OFFSET ${offset}`,
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
