import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const businessReviewProvider: ReviewSourceProvider = {
  definitions: [
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
      label: "Attributed business receipts",
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
    SELECT 'entrepreneurship.'||r.kind AS "metricKey",'INTERACTION'::text AS kind,i.id,r.version::text AS revision,r.summary AS label,LEFT(COALESCE(r.notes,''),800) AS excerpt,r."occurredAt",'/entrepreneurship/interactions/'||i.id AS href,'1'::text AS value,NULL::text AS currency,r."companySnapshot" AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(r.notes,''))>800 AS truncated FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind IN ('OUTREACH_SENT','REPLY_RECEIVED','CONVERSATION') AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end}
    UNION ALL
    (SELECT DISTINCT ON (r."companyId") 'entrepreneurship.companies','COMPANY_CONVERSATION',r."companyId",r.id,COALESCE(r."companySnapshot",r.summary),LEFT(r.summary,800),r."occurredAt",'/entrepreneurship/interactions/'||i.id,'1',NULL,r."companyId",NULL,'FACT',LENGTH(r.summary)>800 FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version WHERE i."userId"=${s.userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND r."companyId" IS NOT NULL AND r."occurredAt">=${s.start} AND r."occurredAt"<${s.end} ORDER BY r."companyId",r."occurredAt" DESC,r.id DESC)
    UNION ALL
    SELECT 'entrepreneurship.decisions','NICHE_DECISION',d.id,d.id,n.name||' · '||d.direction,LEFT(d.rationale,800),d."createdAt",'/entrepreneurship/explorations/'||n.id,'1',NULL,NULL,NULL,'USER_JUDGMENT',LENGTH(d.rationale)>800 FROM niche_decision d JOIN niche n ON n.id=d."nicheId" AND n."userId"=d."userId" WHERE d."userId"=${s.userId} AND d."createdAt">=${s.start} AND d."createdAt"<${s.end}
    UNION ALL
    SELECT 'entrepreneurship.receipts','BUSINESS_RECEIPT',a.id,md5(a."amountMinor"::text||':'||t."updatedAt"::text||':'||a."confirmedAt"::text),a."companySnapshot",LEFT(COALESCE(a.note,''),800),t."occurredAt",'/finance/transactions/'||t.id,a."amountMinor"::text,t.currency,a."companyId",NULL,'FACT',LENGTH(COALESCE(a.note,''))>800 FROM business_receipt_allocation a JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId" WHERE a."userId"=${s.userId} AND a."withdrawnAt" IS NULL AND a."needsReviewAt" IS NULL AND t.type='INCOME' AND t."inflowKind" IN ('EARNED_WORK','BUSINESS_REVENUE') AND t."occurredAt">=${s.start} AND t."occurredAt"<${s.end} ${s.companyId ? Prisma.sql`AND a."companyId"=${s.companyId}` : Prisma.empty} ${s.currency ? Prisma.sql`AND t.currency=${s.currency}` : Prisma.empty}
    UNION ALL
    SELECT 'entrepreneurship.offers','OFFER_EVENT',e.id,e.id,e.kind||' · '||v.title,LEFT(e."sourceDescription",800),e."occurredAt",'/entrepreneurship/offers/'||o.id,'1',NULL,e.kind,NULL,'FACT',LENGTH(e."sourceDescription")>800 FROM offer_event e JOIN offer o ON o.id=e."offerId" AND o."userId"=e."userId" JOIN offer_revision v ON v.id=e."offerRevisionId" AND v."userId"=e."userId" WHERE e."userId"=${s.userId} AND e."retractedAt" IS NULL AND e."occurredAt">=${s.start} AND e."occurredAt"<${s.end}`,
};
