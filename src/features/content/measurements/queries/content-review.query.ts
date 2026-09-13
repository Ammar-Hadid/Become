import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
export const contentReviewProvider: ReviewSourceProvider = {
  definitions: [
    {
      key: "content.works",
      domain: "content",
      label: "Creative works begun",
      unit: "count",
      qualification:
        "Distinct Content identities created in this period. Archive preserves creation history.",
      moment: true,
    },
    {
      key: "content.variants",
      domain: "content",
      label: "Variants created",
      unit: "count",
      qualification:
        "Distinct cuts, formats or languages created. Variants are not independent creative works.",
      moment: false,
    },
    {
      key: "content.publications",
      domain: "content",
      label: "Publications recorded",
      unit: "count",
      qualification:
        "Explicit, non-withdrawn releases, by Amsterdam publication date. Cross-posting produces several publications of the same work.",
      moment: true,
    },
    {
      key: "content.observations",
      domain: "content",
      label: "Dated result observations",
      unit: "count",
      qualification:
        "Non-superseded manual lifetime readings observed during the period and on or after the current publication date. Readings are not period gains or unique people.",
      moment: false,
    },
  ],
  sql: (s) => Prisma.sql`
    SELECT 'content.works'::text AS "metricKey",'CONTENT'::text AS kind,c.id,c.version::text AS revision,c.title AS label,LEFT(c.purpose,800) AS excerpt,c."createdAt" AS "occurredAt",'/content/'||c.id AS href,'1'::text AS value,NULL::text AS currency,NULL::text AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(c.purpose)>800 AS truncated FROM content c WHERE c."userId"=${s.userId} AND c."createdAt">=${s.start} AND c."createdAt"<${s.end}
    UNION ALL
    SELECT 'content.variants','CONTENT_VARIANT',v.id,v.version::text,c.title||' · '||v.name,LEFT(v.hook,800),v."createdAt",'/content/'||c.id||'?variant='||v.id,'1',NULL,v.format,NULL,'FACT',LENGTH(v.hook)>800 FROM content_variant v JOIN content c ON c.id=v."contentId" AND c."userId"=v."userId" WHERE v."userId"=${s.userId} AND v."createdAt">=${s.start} AND v."createdAt"<${s.end}
    UNION ALL
    SELECT 'content.publications','PUBLICATION',p.id,p.version::text||':'||c.version::text||':'||v."mediaVersion"::text,p."publishedTitle",LEFT(c.title||' · '||v.name||' · '||ch.platform||' · '||ch.name,800),(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC','/content/'||c.id||'?variant='||v.id,'1',NULL,ch.platform||' · '||v.format,(SELECT '/api/content/media/'||m.id FROM content_media m WHERE m."variantId"=v.id AND m."userId"=${s.userId} AND m."retiredAt" IS NULL ORDER BY m."createdAt" DESC,m.id DESC LIMIT 1),'FACT',false FROM content_publication p JOIN content_variant v ON v.id=p."variantId" AND v."userId"=p."userId" JOIN content c ON c.id=v."contentId" AND c."userId"=v."userId" JOIN content_channel ch ON ch.id=p."channelId" AND ch."userId"=p."userId" WHERE p."userId"=${s.userId} AND p."withdrawnAt" IS NULL AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'>=${s.start} AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'<${s.end}
    UNION ALL
    SELECT 'content.observations','CONTENT_OBSERVATION',o.id,md5(o.id||':'||p.version::text),p."publishedTitle",LEFT(ch.platform||' lifetime reading: '||concat_ws(', ',CASE WHEN o.views IS NOT NULL THEN o.views::text||' views' END,CASE WHEN o.likes IS NOT NULL THEN o.likes::text||' likes' END,CASE WHEN o.comments IS NOT NULL THEN o.comments::text||' comments' END)||'. Manual observation; not period gains.',800),o."observedAt",'/content/'||v."contentId"||'?variant='||v.id,'1',NULL,ch.platform,NULL,'FACT',false FROM content_performance_observation o JOIN content_publication p ON p.id=o."publicationId" AND p."userId"=o."userId" JOIN content_variant v ON v.id=p."variantId" JOIN content_channel ch ON ch.id=p."channelId" WHERE o."userId"=${s.userId} AND p."withdrawnAt" IS NULL AND o."observedAt">=${s.start} AND o."observedAt"<${s.end} AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM content_performance_observation n WHERE n."supersedesId"=o.id AND n."userId"=${s.userId})`,
};
