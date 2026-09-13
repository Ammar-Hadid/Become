import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import {
  encodeCursor as encodeContentCursor,
  decodeCursor as decodeContentCursor,
} from "@/lib/pagination/utils/keyset-cursor.util";
export {
  encodeCursor as encodeContentCursor,
  decodeCursor as decodeContentCursor,
} from "@/lib/pagination/utils/keyset-cursor.util";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getScriptSummary } from "@/features/content/scripts/queries/content-script.query";
import { Prisma } from "@/generated/prisma/client";
import {
  CONTENT_PLATFORMS,
  CONTENT_STAGES,
} from "@/features/content/constants/content.constants";
import type {
  ChannelView,
  ContentDesk,
  ContentSummary,
  ContentWorkspace,
  PublicationView,
  ContentStage,
  ContentFormat,
  ChannelPlatform,
} from "@/features/content/types/content.types";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";

export async function getContentChannels(
  userId: string,
  tx: DirectionTx = prisma,
): Promise<ChannelView[]> {
  const rows = await tx.channel.findMany({
    where: { userId },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    take: 200,
  });
  return rows.map(channelView);
}
function channelView(c: {
  id: string;
  version: number;
  name: string;
  platform: string;
  account: string;
  platformLabel: string;
  archivedAt: Date | null;
}): ChannelView {
  const platform = c.platform as ChannelPlatform,
    platformName =
      platform === "OTHER"
        ? c.platformLabel || "Other"
        : CONTENT_PLATFORMS[platform];
  return {
    ...c,
    platform,
    platformName,
    displayName: `${platformName} · ${c.name}${c.account ? ` (${c.account})` : ""}`,
    archivedAt: c.archivedAt?.toISOString() ?? null,
  };
}
const publicationInclude = {
  channel: true,
  _count: { select: { observations: true } },
  history: { orderBy: { version: "desc" }, take: 21 },
  observations: {
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    take: 21,
    include: { supersededBy: { select: { id: true } } },
  },
} satisfies Prisma.PublicationInclude;
type PublicationRow = Prisma.PublicationGetPayload<{
  include: typeof publicationInclude;
}>;
export const observationView = (o: PublicationRow["observations"][number]) => ({
  id: o.id,
  observedAt: o.observedAt.toISOString(),
  enteredAt: o.enteredAt.toISOString(),
  views: o.views?.toString() ?? null,
  likes: o.likes?.toString() ?? null,
  comments: o.comments?.toString() ?? null,
  note: o.note,
  supersedesId: o.supersedesId,
  correctionReason: o.correctionReason,
  superseded: o.supersededBy.length > 0,
});
export async function getPublicationViews(
  userId: string,
  ids: string[],
  tx: DirectionTx = prisma,
): Promise<PublicationView[]> {
  if (!ids.length) return [];
  const [publications, latestRows] = await Promise.all([
    tx.publication.findMany({
      where: { userId, id: { in: ids } },
      include: publicationInclude,
    }),
    tx.$queryRaw<
      {
        publicationId: string;
        metric: "views" | "likes" | "comments";
        value: string;
        observedAt: Date;
        enteredAt: Date;
        id: string;
      }[]
    >(
      Prisma.sql`SELECT DISTINCT ON(o."publicationId",m.metric) o."publicationId",m.metric,m.value::text AS value,o."observedAt",o."enteredAt",o.id FROM content_performance_observation o JOIN content_publication p ON p.id=o."publicationId" AND p."userId"=o."userId" CROSS JOIN LATERAL (VALUES('views',o.views),('likes',o.likes),('comments',o.comments)) AS m(metric,value) WHERE o."userId"=${userId} AND o."publicationId" IN (${Prisma.join(ids)}) AND m.value IS NOT NULL AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id) ORDER BY o."publicationId",m.metric,o."observedAt" DESC,o."enteredAt" DESC,o.id DESC`,
    ),
  ]);
  return publications.map((p) => {
    const latest: PublicationView["latest"] = {
      views: null,
      likes: null,
      comments: null,
    };
    for (const row of latestRows.filter((r) => r.publicationId === p.id))
      latest[row.metric] = {
        value: row.value,
        observedAt: row.observedAt.toISOString(),
        enteredAt: row.enteredAt.toISOString(),
        observationId: row.id,
      };
    return {
      id: p.id,
      version: p.version,
      variantId: p.variantId,
      channelId: p.channelId,
      channel: channelView(p.channel),
      publishedTitle: p.publishedTitle,
      publishedOn: p.publishedOn.toISOString().slice(0, 10),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      url: p.url,
      placement: p.placement,
      sourceKind: "MANUAL",
      withdrawnAt: p.withdrawnAt?.toISOString() ?? null,
      withdrawalReason: p.withdrawalReason,
      latest,
      history: p.history.slice(0, 20).map((h) => ({
        id: h.id,
        version: h.version,
        kind: h.kind,
        reason: h.reason,
        recordedAt: h.createdAt.toISOString(),
        snapshot: h.snapshot,
      })),
      historyNextCursor:
        p.history.length > 20 ? String(p.history[19].version) : null,
      observationCount: p._count.observations,
      observations: p.observations.slice(0, 20).map(observationView),
      observationsNextCursor:
        p.observations.length > 20
          ? encodeContentCursor(
              p.observations[19].observedAt,
              p.observations[19].id,
            )
          : null,
    };
  });
}
export async function getPublicationView(
  userId: string,
  id: string,
): Promise<PublicationView | null> {
  return (await getPublicationViews(userId, [id]))[0] ?? null;
}
export async function getVariantPublications(
  userId: string,
  variantId: string,
  cursor?: string,
) {
  const at = decodeContentCursor(cursor);
  const rows = await prisma.publication.findMany({
    where: {
      userId,
      variantId,
      ...(at
        ? {
            OR: [
              { publishedOn: { lt: at.at } },
              { publishedOn: at.at, id: { lt: at.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
    take: 21,
    select: { id: true, publishedOn: true },
  });
  const views = await getPublicationViews(
    userId,
    rows.slice(0, 20).map((p) => p.id),
  );
  return {
    items: rows.slice(0, 20).map((p) => views.find((v) => v.id === p.id)!),
    nextCursor:
      rows.length > 20
        ? encodeContentCursor(rows[19].publishedOn, rows[19].id)
        : null,
  };
}
export async function getContentWorkspace(
  userId: string,
  id: string,
  options: {
    variantCursor?: string;
    variantId?: string;
    publicationIds?: string[];
  } = {},
): Promise<ContentWorkspace | null> {
  return prisma.$transaction(
    (tx) => readContentWorkspace(userId, id, options, tx),
    { isolationLevel: "RepeatableRead", timeout: 15000 },
  );
}
async function readContentWorkspace(
  userId: string,
  id: string,
  options: {
    variantCursor?: string;
    variantId?: string;
    publicationIds?: string[];
  } = {},
  tx: DirectionTx = prisma,
): Promise<ContentWorkspace | null> {
  const variantCursor = decodeContentCursor(options.variantCursor);
  const c = await tx.content.findFirst({
    where: { userId, id },
    include: {
      variants: {
        take: 21,
        where: variantCursor
          ? {
              OR: [
                { createdAt: { gt: variantCursor.at } },
                { createdAt: variantCursor.at, id: { gt: variantCursor.id } },
              ],
            }
          : undefined,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          media: { where: { retiredAt: null }, take: 1 },
          publications: {
            orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
            take: 21,
            select: { id: true, publishedOn: true },
          },
        },
      },
      ideas: { take: 50, include: { idea: true } },
      decisions: { orderBy: { decidedOn: "desc" }, take: 20 },
      experimentSources: { take: 50, include: { experiment: true } },
      criteria: { take: 50, include: { goal: true } },
    },
  });
  if (!c) return null;
  const variants = c.variants.slice(0, 20);
  if (options.variantId && !variants.some((v) => v.id === options.variantId)) {
    const selected = await tx.contentVariant.findFirst({
      where: { id: options.variantId, contentId: id, userId },
      include: {
        media: { where: { retiredAt: null }, take: 1 },
        publications: {
          orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
          take: 21,
          select: { id: true, publishedOn: true },
        },
      },
    });
    if (selected) variants.push(selected);
  }
  const targetedPublications = options.publicationIds?.length
    ? await tx.publication.findMany({
        where: {
          userId,
          id: { in: options.publicationIds.slice(0, 20) },
          variant: { contentId: id },
        },
        select: { id: true, variantId: true, publishedOn: true },
      })
    : [];
  // Preserve the ordinary page and its cursor. Requested mutation results
  // remain visible even when an old release lies beyond the first page.
  const requestedPublications = (v: (typeof variants)[number]) =>
    targetedPublications.filter(
      (p) =>
        p.variantId === v.id &&
        !v.publications.slice(0, 20).some((r) => r.id === p.id),
    );
  const [channels, sessions, totals, domain] = await Promise.all([
    getContentChannels(userId, tx),
    tx.session.findMany({
      where: { userId, contentId: id },
      include: {
        domain: true,
        activityType: true,
        engineeringProject: true,
        pauses: true,
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 51,
    }),
    tx.$queryRaw<{ name: string; seconds: bigint }[]>(
      Prisma.sql`SELECT COALESCE(s."contentActivitySnapshot",a.name) AS name, COALESCE(SUM(${sessionFocusedSecondsSql()})::bigint,0) AS seconds FROM session s JOIN activity_type a ON a.id=s."activityTypeId" WHERE s."userId"=${userId} AND s."contentId"=${id} AND s."endedAt" IS NOT NULL GROUP BY COALESCE(s."contentActivitySnapshot",a.name) ORDER BY name`,
    ),
    tx.domain.findFirst({
      where: { userId, slug: "content", enabled: true },
      include: {
        activityTypes: {
          where: { enabled: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);
  const publicationViews = await getPublicationViews(
    userId,
    variants.flatMap((v) =>
      [...v.publications.slice(0, 20), ...requestedPublications(v)].map(
        (p) => p.id,
      ),
    ),
    tx,
  );
  const active = await tx.session.findFirst({
    where: { userId, contentId: id, endedAt: null },
    select: { id: true },
  });
  return {
    id: c.id,
    workspaceVersion: c.workspaceVersion,
    title: c.title,
    purpose: c.purpose,
    audience: c.audience,
    notes: c.notes,
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    archivedAt: c.archivedAt?.toISOString() ?? null,
    variantsNextCursor:
      c.variants.length > 20
        ? encodeContentCursor(c.variants[19].createdAt, c.variants[19].id)
        : null,
    variants: await Promise.all(
      variants.map(async (v) => ({
        id: v.id,
        contentId: v.contentId,
        version: v.version,
        writingVersion: v.writingVersion,
        mediaVersion: v.mediaVersion,
        name: v.name,
        format: v.format as ContentFormat,
        stage: v.stage as ContentStage,
        stageLabel: CONTENT_STAGES[v.stage as ContentStage].label,
        guidance: CONTENT_STAGES[v.stage as ContentStage].guidance,
        hook: v.hook,
        outline: v.outline,
        scriptSummary: getScriptSummary(v),
        productionNotes: v.productionNotes,
        nextStep: v.nextStep,
        plannedOn: v.plannedOn?.toISOString().slice(0, 10) ?? null,
        archivedAt: v.archivedAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        writingSavedAt: v.writingSavedAt.toISOString(),
        thumbnail: v.media[0]
          ? {
              id: v.media[0].id,
              url: `/api/content/media/${v.media[0].id}`,
              width: v.media[0].width,
              height: v.media[0].height,
            }
          : null,
        publications: [
          ...v.publications.slice(0, 20),
          ...requestedPublications(v),
        ].map((p) => publicationViews.find((view) => view.id === p.id)!),
        publicationsNextCursor:
          v.publications.length > 20
            ? encodeContentCursor(
                v.publications[19].publishedOn,
                v.publications[19].id,
              )
            : null,
      })),
    ),
    channels,
    ideas: c.ideas.map((o) => ({
      id: o.ideaId,
      label: o.idea.title,
      href: `/direction/ideas/${o.ideaId}`,
      archived: !!o.idea.archivedAt,
    })),
    decisions: c.decisions.map((d) => ({
      id: d.id,
      label: d.choice,
      href: `/direction/decisions/${d.id}`,
      archived: !!d.archivedAt,
    })),
    goals: c.criteria.flatMap((r) =>
      r.goal
        ? [
            {
              id: r.goal.id,
              label: r.goal.title,
              href: `/direction/goals/${r.goal.id}`,
              archived: !!r.goal.archivedAt,
            },
          ]
        : [],
    ),
    experiments: c.experimentSources.map((s) => ({
      id: s.experimentId,
      label: s.experiment.title,
      href: `/direction/experiments/${s.experimentId}`,
      archived: !!s.experiment.archivedAt,
    })),
    sessions: sessions.slice(0, 50).map((s) => toSessionListItem(s)),
    sessionsNextCursor:
      sessions.length > 50
        ? encodeContentCursor(sessions[49].startedAt, sessions[49].id)
        : null,
    recordedTime: {
      seconds: totals.reduce((sum, r) => sum + Number(r.seconds), 0),
      byActivity: totals.map((r) => ({
        name: r.name,
        seconds: Number(r.seconds),
      })),
      activeSessionId: active?.id ?? null,
    },
    timer: {
      domainId: domain?.id ?? "",
      activities:
        domain?.activityTypes.map((a) => ({ id: a.id, name: a.name })) ?? [],
    },
  };
}
const summaryInclude = {
  _count: { select: { variants: true } },
  variants: {
    take: 1,
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      stage: true,
      nextStep: true,
      media: { where: { retiredAt: null }, take: 1 },
      _count: { select: { publications: { where: { withdrawnAt: null } } } },
    },
  },
  sessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
} satisfies Prisma.ContentInclude;
type SummaryRow = Prisma.ContentGetPayload<{ include: typeof summaryInclude }>;
function summary(c: SummaryRow, publicationCount: number): ContentSummary {
  const v = c.variants[0];
  return {
    id: c.id,
    title: c.title,
    purpose: c.purpose,
    updatedAt: c.updatedAt.toISOString(),
    archivedAt: c.archivedAt?.toISOString() ?? null,
    variantCount: c._count.variants,
    publicationCount,
    stageLabel: v
      ? CONTENT_STAGES[v.stage as ContentStage].label
      : "No active variant",
    nextStep:
      v?.nextStep ||
      (v ? CONTENT_STAGES[v.stage as ContentStage].guidance : ""),
    thumbnailUrl: v?.media[0] ? `/api/content/media/${v.media[0].id}` : null,
    activeSessionId: c.sessions[0]?.id ?? null,
    href: v ? `/content/${c.id}?variant=${v.id}` : `/content/${c.id}`,
  };
}
export async function getContentDesk(
  userId: string,
  options: { q?: string; cursor?: string; archived?: boolean } = {},
): Promise<ContentDesk> {
  const cursor = decodeContentCursor(options.cursor),
    q = (options.q ?? "").trim().slice(0, 200);
  const [rows, active, releases, ideas] = await Promise.all([
    prisma.content.findMany({
      where: {
        userId,
        archivedAt: options.archived ? { not: null } : null,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { purpose: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { updatedAt: { lt: cursor.at } },
                    { updatedAt: cursor.at, id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 25,
      include: summaryInclude,
    }),
    prisma.content.findFirst({
      where: {
        userId,
        archivedAt: null,
        sessions: { some: { endedAt: null } },
      },
      include: summaryInclude,
    }),
    prisma.publication.findMany({
      where: { userId, withdrawnAt: null },
      include: {
        variant: {
          include: {
            content: true,
            media: {
              where: { retiredAt: null },
              take: 1,
              select: { id: true },
            },
          },
        },
        channel: true,
      },
      orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
      take: 8,
    }),
    prisma.idea.findMany({
      where: {
        userId,
        archivedAt: null,
        OR: [
          { domains: { none: {} } },
          { domains: { some: { domain: { slug: "content" } } } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);
  const ids = [...rows.map((r) => r.id), ...(active ? [active.id] : [])];
  const counts = ids.length
    ? await prisma.$queryRaw<{ contentId: string; count: number }[]>(
        Prisma.sql`SELECT v."contentId",COUNT(*)::int AS count FROM content_publication p JOIN content_variant v ON v.id=p."variantId" WHERE p."userId"=${userId} AND p."withdrawnAt" IS NULL AND v."contentId" IN (${Prisma.join(ids)}) GROUP BY v."contentId"`,
      )
    : [];
  const summarize = (row: SummaryRow) =>
    summary(row, counts.find((c) => c.contentId === row.id)?.count ?? 0);
  const items = rows.slice(0, 24).map(summarize);
  return {
    items,
    nextCursor:
      rows.length > 24
        ? encodeContentCursor(rows[23].updatedAt, rows[23].id)
        : null,
    continueMaking: active
      ? summarize(active)
      : (items.find((i) => !i.archivedAt) ?? null),
    recentPublications: releases.map((p) => ({
      id: p.id,
      contentTitle: p.variant.content.title,
      variantName: p.variant.name,
      channelName: channelView(p.channel).displayName,
      publishedOn: p.publishedOn.toISOString().slice(0, 10),
      thumbnailUrl: p.variant.media[0]
        ? `/api/content/media/${p.variant.media[0].id}`
        : null,
      href: `/content/${p.variant.contentId}?variant=${p.variantId}`,
    })),
    ideas: ideas.map((i) => ({
      id: i.id,
      label: i.title,
      href: `/direction/ideas/${i.id}`,
      archived: false,
    })),
  };
}
