import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const businessReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "entrepreneurship.evidence",
      domain: "entrepreneurship",
      label: "Evidence entries recorded",
      unit: "count",
      qualification:
        "Each current interaction appears once with its observations; standalone observations count separately. Reported group sizes are not contacts or independent corroboration.",
      moment: false,
    },
    {
      key: "entrepreneurship.people",
      domain: "entrepreneurship",
      label: "Distinct people in conversation",
      unit: "count",
      qualification:
        "Owned person identities deduplicated across primary sources and recorded participants in current conversations. Anonymous sources and reported sample sizes cannot establish unique people.",
      moment: false,
    },
    {
      key: "entrepreneurship.responses",
      domain: "entrepreneurship",
      label: "Recipients responding to offers",
      unit: "count",
      qualification:
        "Distinct recipient engagements with a recorded interest, acceptance or rejection in this period. Multiple updates count once. Anonymous engagements do not establish unique people. Outcomes retain their exact offer revision; payment is separate.",
      moment: true,
    },
    {
      key: "entrepreneurship.offerSharing",
      domain: "entrepreneurship",
      label: "Audience offer sharing and closure",
      unit: "count",
      qualification:
        "Sharing, closure and reopening of audience tests are separate from recipient responses.",
      moment: false,
    },
    ...["OUTREACH_SENT", "REPLY_RECEIVED", "CONVERSATION"].map((kind) => ({
      key: `entrepreneurship.${kind}`,
      domain: "entrepreneurship" as const,
      label:
        kind === "CONVERSATION"
          ? "Conversations recorded"
          : kind === "REPLY_RECEIVED"
            ? "Replies received"
            : "Outreach recorded",
      unit: "count" as const,
      qualification: `Current, non-withdrawn ${kind} interaction records dated in the period. Time alone creates no contact fact.`,
      moment: kind === "CONVERSATION",
    })),
    {
      key: "entrepreneurship.companies",
      domain: "entrepreneurship",
      label: "Distinct companies in conversation",
      unit: "count",
      qualification:
        "Companies deduplicated across all qualifying conversations in the period. Evidence shows one representative conversation per company.",
      moment: false,
    },
    {
      key: "entrepreneurship.decisions",
      domain: "entrepreneurship",
      label: "Exploration decisions",
      unit: "count",
      qualification:
        "Explicit user choices and rationale about an exploration; these are judgments, not objective validation.",
      moment: true,
    },
    {
      key: "entrepreneurship.receipts",
      domain: "entrepreneurship",
      label: "Confirmed Entrepreneurship receipts",
      unit: "minor",
      qualification:
        "Confirmed non-withdrawn Finance receipt allocations, excluding pending review. A perspective on the same Finance money, never additional income.",
      moment: false,
    },
    {
      key: "entrepreneurship.offers",
      domain: "entrepreneurship",
      label: "Offer outcomes recorded",
      unit: "count",
      qualification:
        "Non-retracted offer events. Proposals and acceptance are distinct from payment and do not establish income or MRR.",
      moment: true,
    },
  ],
  sql: (s) => Prisma.sql`
    SELECT 'entrepreneurship.evidence' AS "metricKey",'INTERACTION'::text AS kind,i.id,r.version::text AS revision,r.summary AS label,LEFT(COALESCE(r.notes,''),800) AS excerpt,r."occurredAt",'/entrepreneurship/interactions/'||i.id AS href,'1'::text AS value,NULL::text AS currency,COALESCE(r."personSnapshot",r."companySnapshot",r."audienceLabel") AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(r.notes,''))>800 AS truncated FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end}
    UNION ALL
    SELECT 'entrepreneurship.evidence','OBSERVATION',o.id,r.version::text,r.statement,LEFT(COALESCE(r."sourceDescription",''),800),r."observedAt",'/entrepreneurship/observations/'||o.id,'1',NULL,COALESCE(r."personSnapshot",r."companySnapshot",r."audienceLabel"),NULL,'FACT',LENGTH(COALESCE(r."sourceDescription",''))>800 FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r."userId"=o."userId" AND r.version=o.version WHERE o."userId"=${s.userId} AND o."voidedAt" IS NULL AND r."interactionId" IS NULL AND r."observedAt">=${s.start} AND r."observedAt"<${s.end}
    UNION ALL
    (SELECT DISTINCT ON (p.id) 'entrepreneurship.people','PERSON_CONVERSATION',p.id,r.id,p.label,LEFT(r.summary,800),r."occurredAt",'/entrepreneurship/interactions/'||i.id,'1',NULL,p.id,NULL,'FACT',LENGTH(r.summary)>800 FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId" CROSS JOIN LATERAL (SELECT r."personId" AS id,r."personSnapshot" AS label WHERE r."personId" IS NOT NULL UNION SELECT ip."personId",ip."nameSnapshot" FROM interaction_participant ip WHERE ip."interactionRevisionId"=r.id AND ip."userId"=${s.userId}) p WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end} ORDER BY p.id,r."occurredAt" DESC,r.id DESC)
    UNION ALL
    (SELECT DISTINCT ON (e."engagementId") 'entrepreneurship.responses','OFFER_EVENT',e.id,e.id,e.kind||' · '||v.title,LEFT(e."sourceDescription",800),e."occurredAt",'/entrepreneurship/offers/'||e."offerId",'1',NULL,e."engagementId",NULL,'FACT',LENGTH(e."sourceDescription")>800 FROM offer_event e JOIN offer_revision v ON v.id=e."offerRevisionId" AND v."userId"=e."userId" WHERE e."userId"=${s.userId} AND e."retractedAt" IS NULL AND e."engagementId" IS NOT NULL AND e.kind IN ('INTERESTED','ACCEPTED','REJECTED') AND e."occurredAt">=${s.start} AND e."occurredAt"<${s.end} ORDER BY e."engagementId",e."occurredAt" DESC,e.id DESC)
    UNION ALL
    SELECT 'entrepreneurship.'||r.kind AS "metricKey",'INTERACTION'::text AS kind,i.id,r.version::text AS revision,r.summary AS label,LEFT(COALESCE(r.notes,''),800) AS excerpt,r."occurredAt",'/entrepreneurship/interactions/'||i.id AS href,'1'::text AS value,NULL::text AS currency,COALESCE(r."personSnapshot",r."companySnapshot",r."audienceLabel") AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(r.notes,''))>800 AS truncated FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind IN ('OUTREACH_SENT','REPLY_RECEIVED','CONVERSATION') AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end}
    UNION ALL
    (SELECT DISTINCT ON (r."companyId") 'entrepreneurship.companies','COMPANY_CONVERSATION',r."companyId",r.id,COALESCE(r."companySnapshot",r.summary),LEFT(r.summary,800),r."occurredAt",'/entrepreneurship/interactions/'||i.id,'1',NULL,r."companyId",NULL,'FACT',LENGTH(r.summary)>800 FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND r."companyId" IS NOT NULL AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end} ORDER BY r."companyId",r."occurredAt" DESC,r.id DESC)
    UNION ALL
    SELECT 'entrepreneurship.decisions','NICHE_DECISION',d.id,d.id,n.name||' · '||d.direction,LEFT(d.rationale,800),d."createdAt",'/entrepreneurship/explorations/'||n.id,'1',NULL,NULL,NULL,'USER_JUDGMENT',LENGTH(d.rationale)>800 FROM niche_decision d JOIN niche n ON n.id=d."nicheId" AND n."userId"=d."userId" WHERE d."userId"=${s.userId} AND d."createdAt">=${s.start} AND d."createdAt"<${s.end}
    UNION ALL
    SELECT 'entrepreneurship.receipts','BUSINESS_RECEIPT',a.id,md5(a."amountMinor"::text||':'||t."updatedAt"::text||':'||a."confirmedAt"::text),COALESCE(a."personSnapshot",a."companySnapshot",a."audienceLabel",'Anonymous receipt'),LEFT(COALESCE(a.note,''),800),t."occurredAt",'/finance/transactions/'||t.id,a."amountMinor"::text,t.currency,a."companyId",NULL,'FACT',LENGTH(COALESCE(a.note,''))>800 FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" WHERE a."userId"=${s.userId} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('EARNED_WORK','BUSINESS_REVENUE') AND t."occurredAt">=${s.start} AND t."occurredAt"<${s.end} ${s.companyId ? Prisma.sql`AND a."companyId"=${s.companyId}` : Prisma.empty} ${s.currency ? Prisma.sql`AND t.currency=${s.currency}` : Prisma.empty}
    UNION ALL
    SELECT CASE WHEN e.kind IN ('SHARED','CLOSED','REOPENED') THEN 'entrepreneurship.offerSharing' ELSE 'entrepreneurship.offers' END,'OFFER_EVENT',e.id,e.id,e.kind||' · '||v.title,LEFT(e."sourceDescription",800),e."occurredAt",'/entrepreneurship/offers/'||o.id,'1',NULL,e.kind,NULL,'FACT',LENGTH(e."sourceDescription")>800 FROM offer_event e JOIN offer o ON o.id=e."offerId" AND o."userId"=e."userId" JOIN offer_revision v ON v.id=e."offerRevisionId" AND v."userId"=e."userId" WHERE e."userId"=${s.userId} AND e."retractedAt" IS NULL AND e."occurredAt">=${s.start} AND e."occurredAt"<${s.end}`,
};
