import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getAudienceMetrics(
  userId: string,
  scope: { nicheId?: string; start?: Date; end?: Date } = {},
  db: Prisma.TransactionClient = prisma,
) {
  const window = (field: Prisma.Sql) =>
    Prisma.sql`${scope.start ? Prisma.sql`AND ${field}>=${scope.start}` : Prisma.empty} ${scope.end ? Prisma.sql`AND ${field}<${scope.end}` : Prisma.empty}`;
  const rows = await db.$queryRaw<
    {
      marketType: string;
      evidenceEntries: number;
      conversations: number;
      people: number;
      businesses: number;
      anonymousEntries: number;
      aggregateSources: number;
    }[]
  >(Prisma.sql`
 WITH sources AS (
 SELECT r.id,r."audienceContextId",r."identityKind",r."personId",r."companyId",r.kind FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL ${scope.nicheId ? Prisma.sql`AND r."nicheId"=${scope.nicheId}` : Prisma.empty} ${window(Prisma.sql`r."occurredAt"`)}
 UNION ALL
 SELECT r.id,r."audienceContextId",r."identityKind",r."personId",r."companyId",'OBSERVATION' FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r."userId"=o."userId" AND r.version=o.version WHERE o."userId"=${userId} AND o."voidedAt" IS NULL AND r."interactionId" IS NULL ${scope.nicheId ? Prisma.sql`AND r."nicheId"=${scope.nicheId}` : Prisma.empty} ${window(Prisma.sql`r."observedAt"`)}
 ), people_by_context AS (
 SELECT s."audienceContextId",s."personId" AS pid FROM sources s WHERE s.kind IN ('CONVERSATION','REPLY_RECEIVED','OUTREACH_SENT')
 UNION SELECT s."audienceContextId",ip."personId" FROM sources s JOIN interaction_participant ip ON ip."interactionRevisionId"=s.id AND ip."userId"=${userId} WHERE s.kind IN ('CONVERSATION','REPLY_RECEIVED','OUTREACH_SENT')
 ) SELECT COALESCE(ac."marketType",'UNRECORDED') AS "marketType",COUNT(*)::int AS "evidenceEntries",COUNT(*) FILTER(WHERE s.kind='CONVERSATION')::int AS conversations,(SELECT COUNT(DISTINCT p.pid)::int FROM people_by_context p LEFT JOIN audience_context pc ON pc.id=p."audienceContextId" WHERE pc."marketType" IS NOT DISTINCT FROM ac."marketType") AS people,COUNT(DISTINCT s."companyId") FILTER(WHERE s.kind IN ('CONVERSATION','REPLY_RECEIVED','OUTREACH_SENT'))::int AS businesses,COUNT(*) FILTER(WHERE s."identityKind" IN ('ANONYMOUS','UNSPECIFIED'))::int AS "anonymousEntries",COUNT(*) FILTER(WHERE s."identityKind"='GROUP')::int AS "aggregateSources" FROM sources s LEFT JOIN audience_context ac ON ac.id=s."audienceContextId" GROUP BY ac."marketType"`);
  const [people, companies, responses, receipts] = await Promise.all([
    db.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT p.id)::int AS count FROM (SELECT r."personId" AS id FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind<>'ATTEMPT_NO_CONTACT' ${scope.nicheId ? Prisma.sql`AND r."nicheId"=${scope.nicheId}` : Prisma.empty} ${window(Prisma.sql`r."occurredAt"`)} UNION SELECT ip."personId" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version JOIN interaction_participant ip ON ip."interactionRevisionId"=r.id AND ip."userId"=i."userId" WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind<>'ATTEMPT_NO_CONTACT' ${scope.nicheId ? Prisma.sql`AND r."nicheId"=${scope.nicheId}` : Prisma.empty} ${window(Prisma.sql`r."occurredAt"`)}) p`,
    ),
    db.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT r."companyId")::int AS count FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind<>'ATTEMPT_NO_CONTACT' ${scope.nicheId ? Prisma.sql`AND r."nicheId"=${scope.nicheId}` : Prisma.empty} ${window(Prisma.sql`r."occurredAt"`)}`,
    ),
    db.offerEngagement.count({
      where: {
        userId,
        ...(scope.nicheId
          ? { offer: { niches: { some: { nicheId: scope.nicheId } } } }
          : {}),
        events: {
          some: {
            retractedAt: null,
            kind: { in: ["INTERESTED", "ACCEPTED", "REJECTED"] },
            ...(scope.start || scope.end
              ? { occurredAt: { gte: scope.start, lt: scope.end } }
              : {}),
          },
        },
      },
    }),
    db.$queryRaw<{ currency: string; amount: string; receiptCount: number }[]>(
      Prisma.sql`SELECT t.currency,SUM(a."amountMinor")::text AS amount,COUNT(DISTINCT t.id)::int AS "receiptCount" FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" WHERE a."userId"=${userId} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('BUSINESS_REVENUE','EARNED_WORK') ${scope.nicheId ? Prisma.sql`AND (a."nicheId"=${scope.nicheId} OR (a."nicheId" IS NULL AND EXISTS(SELECT 1 FROM offer_revision v JOIN offer_niche n ON n."offerId"=v."offerId" AND n."userId"=v."userId" WHERE v.id=a."offerRevisionId" AND n."nicheId"=${scope.nicheId})))` : Prisma.empty} ${window(Prisma.sql`t."occurredAt"`)} GROUP BY t.currency ORDER BY t.currency`,
    ),
  ]);
  return {
    evidenceEntries: rows.reduce((n, r) => n + r.evidenceEntries, 0),
    conversations: rows.reduce((n, r) => n + r.conversations, 0),
    peopleContacted: people[0].count,
    businessesContacted: companies[0].count,
    responses,
    anonymousEntries: rows.reduce((n, r) => n + r.anonymousEntries, 0),
    aggregateSources: rows.reduce((n, r) => n + r.aggregateSources, 0),
    byMarket: rows,
    receipts,
    qualification:
      "Recorded entries and identified contacts, not population estimates. Group sizes are source-reported; audience breakdowns can overlap in identity and are not additive contact totals.",
  };
}
