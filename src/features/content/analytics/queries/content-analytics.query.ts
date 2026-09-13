import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import { DateTime } from "luxon";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getPeriod } from "@/lib/dates/utils/period.util";
import { readContentMeasurement } from "@/features/content/measurements/queries/content-measurement.query";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { getPublicationViews } from "@/features/content/queries/content.query";
import type {
  ContentAnalytics,
  ContentPeriod,
} from "@/features/content/types/content.types";
export async function getContentAnalytics(
  userId: string,
  period: ContentPeriod = "season",
  date?: string,
): Promise<ContentAnalytics> {
  return prisma.$transaction(
    (tx) => readContentAnalytics(tx, userId, period, date),
    { isolationLevel: "RepeatableRead", timeout: 15000 },
  );
}
async function readContentAnalytics(
  tx: DirectionTx,
  userId: string,
  period: ContentPeriod,
  date?: string,
): Promise<ContentAnalytics> {
  const now = DateTime.now().setZone("Europe/Amsterdam"),
    reference = date
      ? DateTime.fromISO(date, { zone: "Europe/Amsterdam" })
      : now;
  if (!reference.isValid) throw Error("Invalid analytics date");
  const range = getPeriod(reference, period),
    start = range.start.toJSDate(),
    end = DateTime.min(range.end, now).toJSDate();
  const clipped = sessionFocusedSecondsSql("s", { start, end }, now.toJSDate());
  const sessionScope = Prisma.sql`s."userId"=${userId} AND d.slug='content' AND s."endedAt" IS NOT NULL AND s."startedAt"<${end} AND s."endedAt">${start}`;
  const [
    content,
    variants,
    publications,
    activity,
    byContent,
    unlinked,
    active,
    groups,
    recent,
    releasedWorkTime,
  ] = await Promise.all([
    readContentMeasurement(tx, {
      userId,
      metric: "CONTENT_CREATED",
      start,
      end,
    }),
    readContentMeasurement(tx, {
      userId,
      metric: "CONTENT_VARIANTS_CREATED",
      start,
      end,
    }),
    readContentMeasurement(tx, {
      userId,
      metric: "CONTENT_PUBLICATIONS",
      start,
      end,
    }),
    tx.$queryRaw<{ name: string; seconds: string }[]>(
      Prisma.sql`SELECT COALESCE(s."contentActivitySnapshot",a.name) AS name,SUM(${clipped})::text AS seconds FROM session s JOIN domain d ON d.id=s."domainId" JOIN activity_type a ON a.id=s."activityTypeId" WHERE ${sessionScope} GROUP BY COALESCE(s."contentActivitySnapshot",a.name) ORDER BY name`,
    ),
    tx.$queryRaw<{ id: string; title: string; seconds: string }[]>(
      Prisma.sql`SELECT c.id,c.title,SUM(${clipped})::text AS seconds FROM session s JOIN domain d ON d.id=s."domainId" JOIN content c ON c.id=s."contentId" WHERE ${sessionScope} GROUP BY c.id,c.title ORDER BY SUM(${clipped}) DESC,c.id LIMIT 100`,
    ),
    tx.$queryRaw<{ seconds: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM(${clipped}),0)::text AS seconds FROM session s JOIN domain d ON d.id=s."domainId" WHERE ${sessionScope} AND s."contentId" IS NULL`,
    ),
    tx.session.count({
      where: { userId, domain: { slug: "content" }, endedAt: null },
    }),
    tx.$queryRaw<
      { platform: string; format: string; count: number; withResults: number }[]
    >(
      Prisma.sql`SELECT ch.platform,v.format,COUNT(*)::int AS count,COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM content_performance_observation o WHERE o."publicationId"=p.id AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id)))::int AS "withResults" FROM content_publication p JOIN content_variant v ON v.id=p."variantId" JOIN content_channel ch ON ch.id=p."channelId" WHERE p."userId"=${userId} AND p."withdrawnAt" IS NULL AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'>=${start} AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'<${end} GROUP BY ch.platform,v.format ORDER BY ch.platform,v.format`,
    ),
    tx.$queryRaw<
      { id: string; contentId: string; contentTitle: string; format: string }[]
    >(
      Prisma.sql`SELECT p.id,v."contentId",c.title AS "contentTitle",v.format FROM content_publication p JOIN content_variant v ON v.id=p."variantId" JOIN content c ON c.id=v."contentId" JOIN content_performance_observation o ON o."publicationId"=p.id WHERE p."userId"=${userId} AND p."withdrawnAt" IS NULL AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id) GROUP BY p.id,v.id,c.id ORDER BY MAX(o."observedAt") DESC,p.id DESC LIMIT 12`,
    ),
    tx.$queryRaw<{ seconds: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM(${sessionFocusedSecondsSql("s", undefined, now.toJSDate())}),0)::text AS seconds FROM session s WHERE s."userId"=${userId} AND s."endedAt" IS NOT NULL AND s."contentId" IN (SELECT DISTINCT v."contentId" FROM content_publication p JOIN content_variant v ON v.id=p."variantId" WHERE p."userId"=${userId} AND p."withdrawnAt" IS NULL AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'>=${start} AND p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam'<${end})`,
    ),
  ]);
  const recentViews = await getPublicationViews(
    userId,
    recent.map((p) => p.id),
    tx,
  );
  return {
    asOf: now.toISO()!,
    availability: range.start > now ? "NOT_STARTED" : "AVAILABLE",
    allTimeRecordedSecondsForReleasedWorks: Number(releasedWorkTime[0].seconds),
    recentResultsScope:
      "Latest recorded lifetime readings, across all release dates. Metrics and their observation dates remain separate; platforms and formats are not interchangeable.",
    period,
    startOn: range.start.toISODate()!,
    endOn: range.end.minus({ days: 1 }).toISODate()!,
    label: range.label,
    contentCreated: content.count,
    variantsCreated: variants.count,
    publicationsMade: publications.count,
    recordedSeconds: activity.reduce((sum, r) => sum + Number(r.seconds), 0),
    unlinkedSeconds: Number(unlinked[0].seconds),
    activeSessionCount: active,
    byActivity: activity.map((r) => ({ ...r, seconds: Number(r.seconds) })),
    byContent: byContent.map((r) => ({ ...r, seconds: Number(r.seconds) })),
    publicationGroups: groups,
    recentResults: recent.map((p) => {
      const view = recentViews.find((v) => v.id === p.id)!;
      return {
        publicationId: p.id,
        contentTitle: p.contentTitle,
        channelName: view.channel.displayName,
        format: p.format,
        publishedOn: view.publishedOn,
        latest: view.latest,
        href: `/content/${p.contentId}`,
      };
    }),
  };
}
