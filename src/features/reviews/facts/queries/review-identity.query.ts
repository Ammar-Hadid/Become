import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import type {
  ReviewIdentity,
  ReviewPeriod,
} from "@/features/reviews/contracts/types/review.types";
import type { SeasonMediaView } from "@/features/seasons/types/season.types";
import { readPersonaInput } from "@/features/seasons/persona/queries/persona-input.query";
import { seasonClosingCard } from "@/features/seasons/mappers/season-closing.mapper";
import { Prisma } from "@/generated/prisma/client";
import { boundedExcerpt } from "@/features/reviews/facts/utils/review-payload.util";
import { DateTime } from "luxon";
export async function readReviewIdentity(
  tx: DirectionTx,
  userId: string,
  period: ReviewPeriod,
): Promise<ReviewIdentity> {
  const date = DateTime.fromISO(period.startOn),
    year = date.year,
    quarter = Math.floor((date.month - 1) / 3) + 1;
  const last = DateTime.fromISO(period.end)
    .setZone("Europe/Amsterdam")
    .minus({ milliseconds: 1 });
  if (last.year !== year || Math.floor((last.month - 1) / 3) + 1 !== quarter)
    return {
      seasonId: null,
      year,
      quarter,
      title: period.label,
      intention: "",
      characterName: "",
      media: [],
      quotes: [],
      persona: await readPersonaInput(tx, userId, null),
      legacyClosing: false,
    };
  const row = await tx.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
  });
  const persona = await readPersonaInput(tx, userId, row?.id ?? null);
  const closing = seasonClosingCard(row?.closingSnapshot);
  const history = row
    ? await tx.$queryRaw<
        { snapshot: unknown; createdAt: Date; kind: string }[]
      >(
        Prisma.sql`SELECT snapshot,"createdAt",kind FROM season_change WHERE "userId"=${userId} AND "seasonId"=${row.id} AND kind IN ('OPENED','OPENING_SAVED') AND "createdAt"<${new Date(period.evaluatedThrough)} ORDER BY (kind='OPENED') DESC,"createdAt",version LIMIT 1`,
      )
    : [];
  const opening = history[0]?.snapshot as { intention?: unknown } | undefined;
  const originalIntention =
    typeof opening?.intention === "string" ? opening.intention : null;
  const originalRecordedAt =
    originalIntention !== null ? history[0].createdAt.toISOString() : null;
  const intentionCoverage = originalRecordedAt
    ? "Opening wording preserved in saved Season history; its recorded date is supplied. Later wording remains separate."
    : "Original opening wording is unavailable. The saved Season direction is shown without asserting it was the original intention.";
  const uses = row
    ? await tx.seasonMediaUse.findMany({
        where: {
          userId,
          seasonId: row.id,
          identityId: persona.identity?.id ?? null,
          retiredAt: null,
        },
        include: { media: true },
        orderBy: [{ poster: "desc" }, { createdAt: "asc" }],
        take: 8,
      })
    : [];
  const media = uses.map((u): SeasonMediaView => ({
    id: u.media.id,
    href: `/api/direction/media/${u.media.id}`,
    alt: u.media.alt,
    decorative: u.media.decorative,
    width: u.media.width,
    height: u.media.height,
    focalX: u.focalX,
    focalY: u.focalY,
    poster: u.poster,
    provenance: u.media.provenance as unknown as SeasonMediaView["provenance"],
  }));
  const quotes = row
    ? await tx.seasonQuote.findMany({
        where: {
          userId,
          seasonId: row.id,
          identityId: persona.identity?.id ?? null,
          retiredAt: null,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
        take: 6,
      })
    : [];
  return {
    seasonId: row?.id ?? null,
    year,
    quarter,
    title: closing?.title || row?.title || period.label,
    intention: closing?.intention ?? row?.intention ?? "",
    originalIntention,
    originalRecordedAt,
    intentionCoverage,
    characterName: closing?.character.name ?? persona.identity?.name ?? "",
    media: closing?.media ?? media,
    quotes:
      closing?.quotes ??
      quotes.map((q) => ({
        id: q.id,
        text: q.text.slice(0, 1800),
        attribution: q.attribution,
        kind: q.kind as "EXACT" | "PARAPHRASE" | "UNKNOWN",
        featured: q.featured,
        provenance:
          q.provenance as unknown as ReviewIdentity["quotes"][number]["provenance"],
      })),
    persona,
    legacyClosing: !!closing,
  };
}

/** Multi-quarter reviews retain distinct chapters instead of attributing the year to its first COTS. */
export async function readReviewSeasonChapters(
  tx: DirectionTx,
  userId: string,
  period: ReviewPeriod,
) {
  const start = DateTime.fromISO(period.start).setZone("Europe/Amsterdam"),
    periodLast = DateTime.fromISO(period.end)
      .setZone("Europe/Amsterdam")
      .minus({ milliseconds: 1 }),
    through = DateTime.fromISO(period.evaluatedThrough).setZone(
      "Europe/Amsterdam",
    );
  const firstQuarter = Math.floor((start.month - 1) / 3) + 1;
  if (
    through <= start ||
    (start.year === periodLast.year &&
      firstQuarter === Math.floor((periodLast.month - 1) / 3) + 1)
  )
    return [];
  // A yearly reading may include a planned future Season; it is not elapsed history.
  const last = through.minus({ milliseconds: 1 }),
    lastQuarter = Math.floor((last.month - 1) / 3) + 1;
  const rows = await tx.userSeason.findMany({
    where: {
      userId,
      OR: [
        {
          year: start.year,
          quarter: {
            gte: firstQuarter,
            ...(start.year === last.year ? { lte: lastQuarter } : {}),
          },
        },
        ...(start.year !== last.year
          ? [{ year: last.year, quarter: { lte: lastQuarter } }]
          : []),
      ],
    },
    orderBy: [{ year: "asc" }, { quarter: "asc" }],
    take: 4,
  });
  return rows
    .filter(
      (r) =>
        r.openingCompletedAt ||
        r.title ||
        r.intention ||
        (r.character as { name?: string } | null)?.name,
    )
    .map((r) => {
      const closing = seasonClosingCard(r.closingSnapshot),
        character = r.character as { name?: string } | null;
      return {
        year: r.year,
        quarter: r.quarter,
        title: boundedExcerpt(
          closing?.title || r.title || `Season ${r.quarter}`,
          600,
        ),
        intention: boundedExcerpt(
          closing?.intention ?? r.intention ?? "",
          1800,
        ),
        characterName: boundedExcerpt(
          closing?.character.name ?? character?.name ?? "",
          300,
        ),
        href: `/reviews/season/${r.year}-${String((r.quarter - 1) * 3 + 1).padStart(2, "0")}-01`,
      };
    });
}
