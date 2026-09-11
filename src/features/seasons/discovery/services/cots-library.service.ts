import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  requireVersion,
} from "@/features/direction/services/direction-mutation.service";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { lockSeason } from "@/features/seasons/services/season.service";
import {
  getCotsIdentity,
  getCotsCollection,
} from "@/features/seasons/discovery/queries/cots-collection.query";
import { cotsLimits } from "@/features/seasons/discovery/config/cots-provider.config";
export async function getCotsLibrary(
  userId: string,
  year: number,
  quarter: number,
) {
  const current = await getCotsCollection(userId, year, quarter);
  const rows = await prisma.seasonMediaUse.findMany({
    where: {
      userId,
      OR: [
        { identityId: null },
        { identityId: { not: current.identity?.id ?? "" } },
      ],
    },
    include: {
      media: true,
      season: { select: { year: true, quarter: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const seen = new Set<string>();
  return {
    items: rows
      .filter((row) => {
        if (seen.has(row.mediaId)) return false;
        seen.add(row.mediaId);
        return true;
      })
      .map((row) => ({
        mediaId: row.mediaId,
        href: `/api/direction/media/${row.mediaId}`,
        alt: row.media.alt,
        width: row.media.width,
        height: row.media.height,
        seasonTitle: row.season.title,
        year: row.season.year,
        quarter: row.season.quarter,
        credit: (row.media.provenance as { credit?: string }).credit ?? null,
      })),
  };
}
export async function changeCotsMediaUse(userId: string, input: unknown) {
  const c = seasonIdentitySchema
    .extend({
      action: z.enum(["REUSE_IMAGE", "MEDIA_PREFERENCES"]),
      expectedSelectionRevision: z.number().int().min(0),
      mediaId: z.string().max(100),
      poster: z.boolean().optional(),
      secondary: z.boolean().optional(),
      loading: z.boolean().optional(),
      cadence: z.boolean().optional(),
      retire: z.boolean().optional(),
      focalX: z.number().min(0).max(1).optional(),
      focalY: z.number().min(0).max(1).optional(),
    })
    .parse(input);
  await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError("This season is not editable.");
    const active = await getCotsIdentity(userId, season.id, tx);
    if (!active) throw new DirectionError("Confirm your inspiration first.");
    requireVersion(active.row.selectionRevision, c.expectedSelectionRevision);
    const source = await tx.seasonMedia.findFirst({
      where: { id: c.mediaId, userId },
    });
    if (!source)
      throw new DirectionError("This image was not found.", undefined, 404);
    const use = await tx.seasonMediaUse.findUnique({
      where: {
        seasonId_mediaId_identityId: {
          seasonId: season.id,
          mediaId: c.mediaId,
          identityId: active.row.id,
        },
      },
    });
    if (!use && c.action !== "REUSE_IMAGE")
      throw new DirectionError(
        "Reuse this image explicitly before changing its placement.",
      );
    if (
      (!use || use.retiredAt) &&
      !c.retire &&
      (await tx.seasonMediaUse.count({
        where: {
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          retiredAt: null,
        },
      })) >= cotsLimits().images
    )
      throw new DirectionError(
        "The saved image collection is full. Retire an image before reusing another.",
      );
    if (c.poster) {
      await tx.seasonMediaUse.updateMany({
        where: { userId, seasonId: season.id },
        data: { poster: false },
      });
      await tx.seasonCotsSelection.updateMany({
        where: { userId, identityId: active.row.id },
        data: { desiredPoster: false },
      });
    }
    const values = {
      ...(c.poster !== undefined ? { poster: c.poster } : {}),
      ...(c.secondary !== undefined ? { secondary: c.secondary } : {}),
      ...(c.loading !== undefined ? { loading: c.loading } : {}),
      ...(c.cadence !== undefined ? { cadence: c.cadence } : {}),
      ...(c.focalX !== undefined ? { focalX: c.focalX } : {}),
      ...(c.focalY !== undefined ? { focalY: c.focalY } : {}),
      ...(c.retire
        ? { retiredAt: new Date(), poster: false }
        : c.action === "REUSE_IMAGE"
          ? { retiredAt: null }
          : {}),
    };
    if (use)
      await tx.seasonMediaUse.update({ where: { id: use.id }, data: values });
    else
      await tx.seasonMediaUse.create({
        data: {
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          mediaId: source.id,
          ...values,
        },
      });
    await tx.seasonCotsIdentity.update({
      where: { id: active.row.id },
      data: { selectionRevision: { increment: 1 } },
    });
  });
  return getCotsCollection(userId, c.year, c.quarter);
}
export async function changeCotsQuoteUse(userId: string, input: unknown) {
  const c = seasonIdentitySchema
    .extend({
      quoteId: z.string().max(100),
      expectedSelectionRevision: z.number().int().min(0),
      featured: z.boolean().optional(),
      rotation: z.boolean().optional(),
      retire: z.boolean().optional(),
    })
    .parse(input);
  await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError("This season is not editable.");
    const active = await getCotsIdentity(userId, season.id, tx);
    if (!active) throw new DirectionError("Confirm your inspiration first.");
    requireVersion(active.row.selectionRevision, c.expectedSelectionRevision);
    const quote = await tx.seasonQuote.findFirst({
      where: {
        id: c.quoteId,
        userId,
        seasonId: season.id,
        identityId: active.row.id,
        retiredAt: null,
      },
    });
    if (!quote) throw new DirectionError("This text was not found.");
    if (c.featured)
      await tx.seasonQuote.updateMany({
        where: { userId, seasonId: season.id },
        data: { featured: false },
      });
    await tx.seasonQuote.update({
      where: { id: quote.id },
      data: {
        ...(c.featured !== undefined ? { featured: c.featured } : {}),
        ...(c.rotation !== undefined ? { rotation: c.rotation } : {}),
        ...(c.retire
          ? { retiredAt: new Date(), rotation: false, featured: false }
          : {}),
      },
    });
    await tx.seasonCotsIdentity.update({
      where: { id: active.row.id },
      data: { selectionRevision: { increment: 1 } },
    });
  });
  return getCotsCollection(userId, c.year, c.quarter);
}
