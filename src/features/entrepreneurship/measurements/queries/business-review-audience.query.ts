import { Prisma } from "@/generated/prisma/client";
import type { ReviewReadScope } from "@/features/reviews/facts/types/review-source.types";

/** Bounded captured audience context for a qualified review source, never live entity labels. */
export function businessReviewAudienceSql(scope: ReviewReadScope) {
  return Prisma.sql`(SELECT jsonb_build_object(
    'explorationIds',a.niches,'version',1,'marketType',ac."marketType",'classification',CASE WHEN ac.id IS NULL THEN 'NOT_RECORDED' ELSE 'RECORDED' END,
    'contextId',ac.id,'description',LEFT(ac.description,320),
    'segments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s."segmentId",'name',s."nameSnapshot",'description',LEFT(s."descriptionSnapshot",320)) ORDER BY s."segmentId") FROM audience_context_segment s WHERE s."audienceContextId"=ac.id AND s."userId"=${scope.userId}),'[]'::jsonb),
    'identityKind',a.identity,'personId',a.person,'personLabel',a.person_label,'businessId',a.company,'businessLabel',a.company_label,
    'sourceDescription',LEFT(a.label,320),'reportedSampleSize',a.sample,'reportedSampleUnit',a.sample_unit,'recipientOutcome',a.outcome
  ) FROM (
    SELECT v."audienceContextId" AS context,v."identityKind" AS identity,v."personId" AS person,v."personSnapshot" AS person_label,v."companyId" AS company,v."companySnapshot" AS company_label,v."audienceLabel" AS label,v."sampleSize" AS sample,v."sampleUnit" AS sample_unit,NULL::jsonb AS outcome,ARRAY_REMOVE(ARRAY[v."nicheId"],NULL) AS niches
    FROM interaction i JOIN interaction_revision v ON v."interactionId"=i.id AND v.version=i.version AND v."userId"=i."userId" WHERE i."userId"=${scope.userId} AND r.kind IN ('INTERACTION','COMPANY_CONVERSATION','PERSON_CONVERSATION') AND (i.id=r.id OR v.id=r.revision)
    UNION ALL
    SELECT v."audienceContextId",v."identityKind",v."personId",v."personSnapshot",v."companyId",v."companySnapshot",v."audienceLabel",v."sampleSize",v."sampleUnit",NULL::jsonb,ARRAY_REMOVE(ARRAY[v."nicheId"],NULL)
    FROM observation o JOIN observation_revision v ON v."observationId"=o.id AND v.version=o.version AND v."userId"=o."userId" WHERE o."userId"=${scope.userId} AND r.kind='OBSERVATION' AND o.id=r.id
    UNION ALL
    SELECT a."audienceContextId",a."identityKind",a."personId",a."personSnapshot",a."companyId",a."companySnapshot",a."audienceLabel",NULL::int,NULL::text,jsonb_build_object('engagementId',a."engagementId",'offerRevisionId',a."offerRevisionId",'kind','PAYMENT'),CASE WHEN a."nicheId" IS NOT NULL THEN ARRAY[a."nicheId"] ELSE ARRAY(SELECT n."nicheId" FROM offer_revision v JOIN offer_niche n ON n."offerId"=v."offerId" AND n."userId"=v."userId" WHERE v.id=a."offerRevisionId" AND v."userId"=${scope.userId}) END
    FROM business_receipt_allocation a WHERE a."userId"=${scope.userId} AND r.kind='BUSINESS_RECEIPT' AND a.id=r.id
    UNION ALL
    SELECT COALESCE(g."audienceContextId",v."audienceContextId"),COALESCE(g."identityKind",v."identityKind"),g."personId",g."personSnapshot",g."companyId",g."companySnapshot",g."audienceLabel",NULL::int,NULL::text,jsonb_build_object('engagementId',g.id,'offerRevisionId',v.id,'version',v.version,'kind',e.kind,'mode',o.mode,'priceMinor',v."priceMinor"::text,'currency',v.currency,'priceBasis',v."priceBasis",'intervalUnit',v."intervalUnit",'intervalCount',v."intervalCount",'scope',LEFT(v.scope,800),'terms',LEFT(v.terms,800)),ARRAY(SELECT n."nicheId" FROM offer_niche n WHERE n."offerId"=o.id AND n."userId"=${scope.userId})
    FROM offer_event e JOIN offer o ON o.id=e."offerId" AND o."userId"=e."userId" JOIN offer_revision v ON v.id=e."offerRevisionId" AND v."userId"=e."userId" LEFT JOIN offer_engagement g ON g.id=e."engagementId" AND g."userId"=e."userId" WHERE e."userId"=${scope.userId} AND r.kind='OFFER_EVENT' AND e.id=r.id
  ) a LEFT JOIN audience_context ac ON ac.id=a.context AND ac."userId"=${scope.userId} LIMIT 1)`;
}
