import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import type { SeasonMediaView } from "@/features/seasons/types/season.types";
export async function getSeasonLoadingSnapshot(userId: string) {
  const current = getSeasonForDate(DateTime.now().setZone("Europe/Amsterdam"));
  const season = await prisma.userSeason.findUnique({
    where: {
      userId_year_quarter: {
        userId,
        year: current.year,
        quarter: current.season,
      },
    },
    select: { id: true, closedAt: true },
  });
  const identity = season ? await getCotsIdentity(userId, season.id) : null;
  const use =
    season && !season.closedAt
      ? await prisma.seasonMediaUse.findFirst({
          where: {
            userId,
            seasonId: season.id,
            identityId: identity?.row.id ?? null,
            retiredAt: null,
            loading: true,
            media: { previewStorageKey: { not: null } },
          },
          include: { media: true },
          orderBy: [{ poster: "desc" }, { createdAt: "asc" }],
        })
      : null;
  const media: SeasonMediaView | null = use
    ? {
        id: use.mediaId,
        useId: use.id,
        href: `/api/direction/media/${use.mediaId}`,
        previewHref: `/api/direction/media/${use.mediaId}?size=preview`,
        hasAlpha: use.media.hasAlpha,
        alt: use.media.alt,
        decorative: use.media.decorative,
        width: use.media.width,
        height: use.media.height,
        focalX: use.focalX,
        focalY: use.focalY,
        poster: use.poster,
        loading: true,
        provenance: use.media
          .provenance as unknown as SeasonMediaView["provenance"],
      }
    : null;
  return { year: current.year, quarter: current.season, media };
}
