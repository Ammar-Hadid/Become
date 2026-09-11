import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { lockSeason } from "@/features/seasons/services/season.service";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { seasonPreviewKey } from "@/features/seasons/media/services/season-image-preview.service";

/** Bounded, owner-scoped housekeeping during explicit discovery; no scheduler required. */
export async function maintainCotsDiscovery(userId: string) {
  const expired = await prisma.$queryRaw<
    { id: string; seasonId: string; year: number; quarter: number }[]
  >`
    SELECT c.id, c."seasonId", s.year, s.quarter
    FROM season_cots_candidate c JOIN user_season s ON s.id = c."seasonId" AND s."userId" = c."userId"
    WHERE c."userId" = ${userId} AND c."expiresAt" < NOW()
      AND NOT EXISTS (SELECT 1 FROM season_cots_selection x WHERE x."candidateId" = c.id)
    ORDER BY c."expiresAt" ASC LIMIT 100`;
  for (const seasonId of new Set(expired.map((v) => v.seasonId))) {
    const rows = expired.filter((v) => v.seasonId === seasonId);
    await prisma.$transaction(async (tx) => {
      await lockSeason(tx, userId, rows[0].year, rows[0].quarter);
      const selected = await tx.seasonCotsSelection.findMany({
        where: { userId, candidateId: { in: rows.map((v) => v.id) } },
        select: { candidateId: true },
      });
      await tx.seasonCotsCandidate.deleteMany({
        where: {
          userId,
          expiresAt: { lt: new Date() },
          id: {
            in: rows.map((v) => v.id),
            notIn: selected.map((v) => v.candidateId),
          },
        },
      });
    });
  }
  const abandoned = await prisma.seasonCotsSelection.findMany({
    where: {
      userId,
      status: "FAILED",
      storageKey: { not: null },
      updatedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
    },
    select: { id: true, season: { select: { year: true, quarter: true } } },
    take: 3,
  });
  for (const job of abandoned)
    await prisma.$transaction(async (tx) => {
      await lockSeason(tx, userId, job.season.year, job.season.quarter);
      const current = await tx.seasonCotsSelection.findFirst({
        where: {
          id: job.id,
          userId,
          status: "FAILED",
          updatedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
        },
      });
      if (
        !current?.storageKey ||
        (await tx.seasonMedia.count({
          where: { storageKey: current.storageKey },
        }))
      )
        return;
      // Retain the snapshot and failed selection, allowing a new download on explicit retry.
      // Lock prevents a retry from racing this removal; an interrupted transaction leaves a retryable key.
      await getMediaStorage().remove(current.storageKey);
      await getMediaStorage().remove(seasonPreviewKey(current.storageKey));
      await tx.seasonCotsSelection.update({
        where: { id: current.id },
        data: { storageKey: null },
      });
    });
}
