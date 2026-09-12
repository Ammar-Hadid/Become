import { Prisma } from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
export async function readContentMeasurement(
  tx: DirectionTx,
  s: {
    userId: string;
    metric:
      "CONTENT_CREATED" | "CONTENT_VARIANTS_CREATED" | "CONTENT_PUBLICATIONS";
    start: Date;
    end: Date;
    contentId?: string;
    channelId?: string;
    contentFormat?: string;
    contentIds?: string[];
  },
  offset = 0,
) {
  const scope = Prisma.sql`c."userId"=${s.userId} ${s.contentId ? Prisma.sql`AND c.id=${s.contentId}` : Prisma.empty} ${s.contentIds ? (s.contentIds.length ? Prisma.sql`AND c.id IN (${Prisma.join(s.contentIds)})` : Prisma.sql`AND FALSE`) : Prisma.empty}`;
  const rowsSql =
    s.metric === "CONTENT_CREATED"
      ? Prisma.sql`SELECT c.id,c.id AS "contentId",c.title,c."createdAt" AS "occurredAt",c."createdAt"::text AS stamp FROM content c WHERE ${scope}`
      : s.metric === "CONTENT_VARIANTS_CREATED"
        ? Prisma.sql`SELECT v.id,c.id AS "contentId",c.title||' · '||v.name AS title,v."createdAt" AS "occurredAt",v."createdAt"::text||':'||v.format AS stamp FROM content_variant v JOIN content c ON c.id=v."contentId" AND c."userId"=v."userId" WHERE ${scope} ${s.contentFormat ? Prisma.sql`AND v.format=${s.contentFormat}` : Prisma.empty}`
        : Prisma.sql`SELECT p.id,c.id AS "contentId",p."publishedTitle"||' · '||ch.name AS title,p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam' AS "occurredAt",p.version::text||':'||p."publishedOn"::text||':'||p."channelId"||':'||v.format AS stamp FROM content_publication p JOIN content_variant v ON v.id=p."variantId" AND v."userId"=p."userId" JOIN content c ON c.id=v."contentId" AND c."userId"=v."userId" JOIN content_channel ch ON ch.id=p."channelId" AND ch."userId"=p."userId" WHERE ${scope} AND p."withdrawnAt" IS NULL ${s.channelId ? Prisma.sql`AND p."channelId"=${s.channelId}` : Prisma.empty} ${s.contentFormat ? Prisma.sql`AND v.format=${s.contentFormat}` : Prisma.empty}`;
  const qualified = Prisma.sql`WITH records AS (${rowsSql}) SELECT * FROM records WHERE "occurredAt">=${s.start} AND "occurredAt"<${s.end}`;
  const [totals, rows] = await Promise.all([
    tx.$queryRaw<{ count: number; hash: string }[]>(
      Prisma.sql`WITH qualified AS (${qualified}) SELECT COUNT(*)::int AS count,md5(COALESCE(string_agg(id||':'||stamp,',' ORDER BY id),'')) AS hash FROM qualified`,
    ),
    tx.$queryRaw<
      { id: string; contentId: string; title: string; occurredAt: Date }[]
    >(
      Prisma.sql`${qualified} ORDER BY "occurredAt" DESC,id DESC LIMIT 25 OFFSET ${offset}`,
    ),
  ]);
  return { ...totals[0], rows };
}
export async function readContentCohort(
  tx: DirectionTx,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return { sources: [], fingerprint: "empty" };
  const rows = await tx.$queryRaw<
    {
      id: string;
      title: string;
      archivedAt: Date | null;
      variantCount: number;
      publicationCount: number;
      observationCount: number;
      latestObservedAt: Date | null;
      hash: string;
    }[]
  >(Prisma.sql`
 SELECT c.id,c.title,c."archivedAt",
 (SELECT COUNT(*)::int FROM content_variant v WHERE v."contentId"=c.id) AS "variantCount",
 (SELECT COUNT(*)::int FROM content_publication p JOIN content_variant v ON v.id=p."variantId" WHERE v."contentId"=c.id AND p."withdrawnAt" IS NULL) AS "publicationCount",
 (SELECT COUNT(*)::int FROM content_performance_observation o JOIN content_publication p ON p.id=o."publicationId" JOIN content_variant v ON v.id=p."variantId" WHERE v."contentId"=c.id AND p."withdrawnAt" IS NULL AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS (SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id)) AS "observationCount",
 (SELECT MAX(o."observedAt") FROM content_performance_observation o JOIN content_publication p ON p.id=o."publicationId" JOIN content_variant v ON v.id=p."variantId" WHERE v."contentId"=c.id AND p."withdrawnAt" IS NULL AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS (SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id)) AS "latestObservedAt",
 md5(COALESCE((SELECT string_agg(v.id||':'||v.format,',' ORDER BY v.id) FROM content_variant v WHERE v."contentId"=c.id),'')||';'||COALESCE((SELECT string_agg(p.id||':'||p.version::text||':'||COALESCE(o.id,'')||':'||COALESCE(o."supersedesId",''),',' ORDER BY p.id,o.id) FROM content_publication p JOIN content_variant v ON v.id=p."variantId" LEFT JOIN content_performance_observation o ON o."publicationId"=p.id WHERE v."contentId"=c.id),'')) AS hash
 FROM content c WHERE c."userId"=${userId} AND c.id IN (${Prisma.join(ids)}) ORDER BY c.id`);
  return {
    sources: rows.map((r) => ({
      id: r.id,
      label: r.title,
      href: `/content/${r.id}`,
      variantCount: r.variantCount,
      publicationCount: r.publicationCount,
      observationCount: r.observationCount,
      latestObservedAt: r.latestObservedAt?.toISOString() ?? null,
      archived: !!r.archivedAt,
    })),
    fingerprint: rows.map((r) => `${r.id}:${r.hash}`).join(";"),
  };
}
