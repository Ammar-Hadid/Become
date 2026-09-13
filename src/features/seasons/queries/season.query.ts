import { seasonClosingCard } from "@/features/seasons/mappers/season-closing.mapper";
import { seasonCharacter } from "@/features/seasons/mappers/season-character.mapper";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { seasonPresentation } from "@/features/seasons/presentation/utils/season-presentation.util";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import {
  emptySeasonDraft,
  seasonCalendar,
} from "@/features/seasons/utils/season-calendar.util";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import {
  getGoalView,
  getExperimentView,
} from "@/features/direction/queries/direction.query";
import type {
  SeasonView,
  SeasonMediaView,
  SeasonQuoteView,
} from "@/features/seasons/types/season.types";
import type { PageResult } from "@/features/direction/types/direction.types";
export async function getSeasonView(
  userId: string,
  year?: number,
  quarter?: number,
  tx: DirectionTx = prisma,
): Promise<SeasonView> {
  const now = DateTime.now().setZone("Europe/Amsterdam"),
    current = getSeasonForDate(now),
    identity = seasonIdentitySchema.parse({
      year: year ?? current.year,
      quarter: quarter ?? current.season,
    });
  const calendar = seasonCalendar(identity.year, identity.quarter, now);
  const row = await tx.userSeason.findUnique({
    where: { userId_year_quarter: { userId, ...identity } },
    include: {
      media: { where: { retiredAt: null }, orderBy: { createdAt: "asc" } },
      quotes: { where: { retiredAt: null }, orderBy: { createdAt: "asc" } },
      goals: { orderBy: { position: "asc" } },
      milestones: true,
    },
  });
  const previous = await tx.userSeason.findFirst({
    where: {
      userId,
      OR: [
        { year: { lt: identity.year } },
        { year: identity.year, quarter: { lt: identity.quarter } },
      ],
    },
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    select: { year: true, quarter: true, title: true, closingNote: true },
  });
  const cots = row ? await getCotsIdentity(userId, row.id, tx) : null;
  const uses = row
    ? await tx.seasonMediaUse.findMany({
        where: {
          userId,
          seasonId: row.id,
          identityId: cots?.row.id ?? null,
          retiredAt: null,
        },
        include: { media: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const media: SeasonMediaView[] = uses.map((use) => ({
    id: use.mediaId,
    useId: use.id,
    href: `/api/direction/media/${use.mediaId}`,
    alt: use.media.alt,
    decorative: use.media.decorative,
    width: use.media.width,
    height: use.media.height,
    focalX: use.focalX,
    focalY: use.focalY,
    poster: use.poster,
    previewHref: use.media.previewStorageKey
      ? `/api/direction/media/${use.mediaId}?size=preview`
      : null,
    hasAlpha: use.media.hasAlpha,
    secondary: use.secondary,
    loading: use.loading,
    cadence: use.cadence,
    provenance: use.media
      .provenance as unknown as SeasonMediaView["provenance"],
  }));
  const quotes: SeasonQuoteView[] = (row?.quotes ?? [])
    .filter((q) => q.identityId === (cots?.row.id ?? null))
    .map((q) => ({
      id: q.id,
      text: q.text,
      attribution: q.attribution,
      kind: q.kind as SeasonQuoteView["kind"],
      featured: q.featured,
      rotation: q.rotation,
      provenance: q.provenance as unknown as SeasonQuoteView["provenance"],
    }));
  const draft = emptySeasonDraft();
  const goals: SeasonView["goals"] = [];
  for (const g of row?.goals ?? []) {
    const goal = await getGoalView(userId, g.goalId, tx);
    if (goal)
      goals.push({
        role: g.role as "PRIMARY" | "SUPPORTING",
        note: g.note,
        goal,
      });
  }
  const experiments: SeasonView["experiments"] = [];
  if (goals.length) {
    const trials = await tx.experiment.findMany({
      where: {
        userId,
        archivedAt: null,
        goalId: { in: goals.map((g) => g.goal.id) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true },
    });
    for (const trial of trials) {
      const view = await getExperimentView(userId, trial.id, tx);
      if (view) experiments.push(view);
    }
  }
  let cadence: SeasonView["cadence"] = null;
  const key = ["MIDPOINT", "FINAL_14", "FINAL_7", "FINAL_3", "ENDED"].includes(
    calendar.phase,
  )
    ? calendar.phase
    : null;
  if (
    row &&
    key &&
    !row.closedAt &&
    (!row.snoozedUntil || row.snoozedUntil <= now.toJSDate()) &&
    !row.milestones.some((m) => m.key === key)
  )
    cadence = {
      key,
      title:
        key === "ENDED"
          ? "This season has ended"
          : key === "MIDPOINT"
            ? "Return to your direction"
            : calendar.phase === "FINAL_3"
              ? "The final days"
              : calendar.phase === "FINAL_7"
                ? "The final week"
                : "The final stretch",
      body:
        key === "ENDED"
          ? "Keep what matters. Choose what continues. Closing changes no goal's progress or horizon."
          : "Revisit your opening intention, the evidence you have recorded, and the time that remains.",
    };
  return {
    cotsIdentity: cots?.view ?? null,
    openingDeferred: Boolean(row?.openingDeferredAt),
    presentation: seasonPresentation(
      row?.id ?? `${identity.year}-${identity.quarter}`,
      cots?.row.id ?? "legacy",
      media,
      quotes,
      cadence?.key ?? null,
      now,
    ),
    ...draft,
    ...identity,
    id: row?.id ?? null,
    version: row?.version ?? 0,
    calendar,
    title: row?.title ?? "",
    intention: row?.intention ?? "",
    stage: row?.stage ?? 1,
    answers: { ...draft.answers, ...(row?.answers as object) },
    character: seasonCharacter(row?.character),
    openingCompletedAt: row?.openingCompletedAt?.toISOString() ?? null,
    goals,
    experiments,
    cadence,
    media,
    quotes,
    closedAt: row?.closedAt?.toISOString() ?? null,
    closingNote: row?.closingNote ?? null,
    closingSnapshot: row?.closingSnapshot ?? null,
    closingCard: seasonClosingCard(row?.closingSnapshot),
    readyForReview: row?.readyForReview ?? false,
    previous: previous
      ? {
          ...previous,
          href: `/direction/seasons/${previous.year}/${previous.quarter}`,
        }
      : null,
  };
}
export async function getSeasonLibrary(
  userId: string,
  options: { search?: string; cursor?: string } = {},
): Promise<PageResult<SeasonView>> {
  const cursor = options.cursor?.split("-").map(Number);
  const rows = await prisma.userSeason.findMany({
    where: {
      userId,
      ...(options.search
        ? {
            title: {
              contains: options.search.slice(0, 200),
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(cursor && cursor.length === 2
        ? {
            OR: [
              { year: { lt: cursor[0] } },
              { year: cursor[0], quarter: { lt: cursor[1] } },
            ],
          }
        : {}),
    },
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    take: 13,
    select: { year: true, quarter: true },
  });
  const items: SeasonView[] = [];
  for (const row of rows.slice(0, 12))
    items.push(await getSeasonView(userId, row.year, row.quarter));
  return {
    items,
    nextCursor:
      rows.length > 12 ? `${rows[11].year}-${rows[11].quarter}` : null,
  };
}
