import { randomUUID } from "node:crypto";
import { cotsLimits } from "@/features/seasons/discovery/config/cots-provider.config";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  requireVersion,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import {
  mediaMetadataSchema,
  quoteDraftSchema,
  seasonMediaCommand,
  manualProvenanceSchema,
} from "@/features/seasons/media/schemas/season-media.schema";
import { normalizeSeasonImage } from "@/features/seasons/media/services/season-image.service";
import {
  prepareSeasonImagePreview,
  seasonPreviewKey,
} from "@/features/seasons/media/services/season-image-preview.service";

const provenance = (
  input: z.infer<typeof manualProvenanceSchema>,
  existing?: unknown,
) => {
  const prior = existing as
    | {
        origin?: string;
        provider?: string | null;
        externalId?: string | null;
        selectedAt?: string;
      }
    | undefined;
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    version: 2,
    origin: prior?.origin === "DISCOVERY" ? "DISCOVERY" : "MANUAL",
    sourceUrl: input.sourceUrl || null,
    sourceTitle: input.sourceTitle || null,
    credit: input.credit || null,
    provider: prior?.provider ?? null,
    externalId: prior?.externalId ?? null,
    attributionVerified: input.attributionVerified,
    evidence: input.attributionVerified
      ? input.sourceUrl
        ? "ORIGINAL_REVIEWED"
        : "OFFLINE_REVIEWED"
      : "UNRESOLVED",
    sourceDetail: input.sourceDetail,
    language: input.language,
    selectedAt: prior?.selectedAt ?? new Date().toISOString(),
  };
};
async function change(
  tx: DirectionTx,
  userId: string,
  seasonId: string,
  operationKey: string,
  hash: string,
  kind: string,
  snapshot: unknown,
  independent = false,
) {
  const row = independent
    ? await tx.userSeason.findUniqueOrThrow({ where: { id: seasonId } })
    : await tx.userSeason.update({
        where: { id: seasonId },
        data: { version: { increment: 1 } },
      });
  if (independent)
    await tx.seasonCotsIdentity.updateMany({
      where: { userId, seasonId, active: true },
      data: { selectionRevision: { increment: 1 } },
    });
  await tx.seasonChange.create({
    data: {
      userId,
      seasonId,
      version: row.version,
      operationKey,
      fingerprint: hash,
      kind,
      reason: "Season inspiration updated.",
      snapshot: jsonValue(snapshot),
    },
  });
  return { id: seasonId, version: row.version };
}
async function priorChange(
  tx: DirectionTx,
  userId: string,
  operationKey: string,
  hash: string,
) {
  const prior = await tx.seasonChange.findUnique({
    where: { userId_operationKey: { userId, operationKey } },
  });
  if (!prior) return null;
  if (prior.fingerprint !== hash)
    throw new DirectionError(
      "This submission was already saved with different values.",
    );
  return { id: prior.seasonId, version: prior.version };
}
export async function uploadSeasonMedia(
  userId: string,
  input: unknown,
  bytes: Buffer,
  independentRevision?: number,
) {
  const c = seasonMediaCommand
    .extend({ draft: mediaMetadataSchema })
    .parse(input);
  const image = await normalizeSeasonImage(bytes),
    hash = fingerprint({ c, contentHash: image.contentHash });
  const storage = getMediaStorage();
  let createdKey: string | null = null;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const season = await lockSeason(tx, userId, c.year, c.quarter);
        const prior = await priorChange(tx, userId, c.operationKey, hash);
        if (prior) return prior;
        if (!season)
          throw new DirectionError("Save your opening before adding an image.");
        if (independentRevision === undefined)
          requireVersion(season.version, c.expectedVersion);
        if (season.closedAt) throw new DirectionError("This season is closed.");
        const identity = await getCotsIdentity(userId, season.id, tx);
        if (independentRevision !== undefined) {
          if (!identity)
            throw new DirectionError("Confirm your inspiration first.");
          requireVersion(identity.row.selectionRevision, independentRevision);
        }
        if (
          (await tx.seasonMediaUse.count({
            where: {
              userId,
              seasonId: season.id,
              identityId: identity?.row.id ?? null,
              retiredAt: null,
            },
          })) >= cotsLimits().images
        )
          throw new DirectionError(
            `Keep up to ${cotsLimits().images} images per inspiration. Retire an image before adding another.`,
          );
        const storageKey = `media/seasons/${season.id}/${randomUUID()}.webp`;
        await storage.put(storageKey, image.bytes);
        createdKey = storageKey;
        const previewStorageKey = await prepareSeasonImagePreview(
          storageKey,
          image.bytes,
        );
        if (c.draft.poster)
          await tx.seasonMedia.updateMany({
            where: { userId, seasonId: season.id, poster: true },
            data: { poster: false },
          });
        const { bytes: ignored, ...metadata } = image;
        void ignored;
        const media = await tx.seasonMedia.create({
          data: {
            userId,
            seasonId: season.id,
            storageKey,
            previewStorageKey,
            ...metadata,
            ...c.draft,
            provenance: jsonValue(provenance(c.draft.provenance)),
          },
        });
        if (c.draft.poster)
          await tx.seasonMediaUse.updateMany({
            where: { userId, seasonId: season.id },
            data: { poster: false },
          });
        await tx.seasonMediaUse.create({
          data: {
            userId,
            seasonId: season.id,
            mediaId: media.id,
            identityId: identity?.row.id ?? null,
            focalX: c.draft.focalX,
            focalY: c.draft.focalY,
            poster: c.draft.poster,
          },
        });
        return change(
          tx,
          userId,
          season.id,
          c.operationKey,
          hash,
          "IMAGE_ADDED",
          { mediaId: media.id, ...c.draft },
          independentRevision !== undefined,
        );
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (createdKey) {
      // A connection can fail after COMMIT. Remove only after proving that no row references the file.
      try {
        if (
          !(await prisma.seasonMedia.findUnique({
            where: { storageKey: createdKey },
            select: { id: true },
          }))
        ) {
          await storage.remove(createdKey);
          await storage.remove(seasonPreviewKey(createdKey));
        }
      } catch (cleanupError) {
        console.error(
          "Media retained for reconciliation after uncertain transaction",
          cleanupError,
        );
      }
    }
    throw error;
  }
}
export async function saveSeasonMedia(userId: string, input: unknown) {
  const c = seasonMediaCommand
      .extend({
        mediaId: z.string(),
        draft: mediaMetadataSchema.optional(),
        retire: z.boolean().default(false),
      })
      .parse(input),
    hash = fingerprint(c);
  return prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    const prior = await priorChange(tx, userId, c.operationKey, hash);
    if (prior) return prior;
    if (!season) throw new DirectionError("Season not found.");
    if (season.closedAt) throw new DirectionError("This season is closed.");
    requireVersion(season.version, c.expectedVersion);
    const media = await tx.seasonMedia.findFirst({
      where: { id: c.mediaId, userId },
    });
    if (!media) throw new DirectionError("Image not found.");
    const identity = await getCotsIdentity(userId, season.id, tx);
    const use = await tx.seasonMediaUse.findFirst({
      where: {
        userId,
        seasonId: season.id,
        mediaId: media.id,
        identityId: identity?.row.id ?? null,
        retiredAt: null,
      },
    });
    if (!use)
      throw new DirectionError(
        "This image belongs to another inspiration. Reuse it explicitly first.",
      );
    if (c.retire)
      await tx.seasonMediaUse.update({
        where: { id: use.id },
        data: { retiredAt: new Date(), poster: false },
      });
    else if (c.draft) {
      if (c.draft.poster)
        await tx.seasonMediaUse.updateMany({
          where: { userId, seasonId: season.id },
          data: { poster: false },
        });
      await tx.seasonMediaUse.update({
        where: { id: use.id },
        data: {
          focalX: c.draft.focalX,
          focalY: c.draft.focalY,
          poster: c.draft.poster,
        },
      });
    }
    if (c.retire && media.seasonId === season.id)
      await tx.seasonMedia.update({
        where: { id: media.id },
        data: { retiredAt: new Date(), poster: false },
      });
    else if (!c.retire) {
      if (!c.draft) throw new DirectionError("Provide image details.");
      if (c.draft.poster)
        await tx.seasonMedia.updateMany({
          where: { userId, seasonId: season.id, poster: true },
          data: { poster: false },
        });
      await tx.seasonMedia.update({
        where: { id: media.id },
        data: {
          ...c.draft,
          poster: media.seasonId === season.id ? c.draft.poster : media.poster,
          provenance: jsonValue(
            provenance(c.draft.provenance, media.provenance),
          ),
        },
      });
    }
    // Retired bytes remain available to immutable season closing snapshots.
    return change(
      tx,
      userId,
      season.id,
      c.operationKey,
      hash,
      c.retire ? "IMAGE_RETIRED" : "IMAGE_CHANGED",
      { before: media, after: c },
    );
  });
}
export async function saveSeasonQuote(
  userId: string,
  input: unknown,
  independentRevision?: number,
) {
  const c = seasonMediaCommand
      .extend({
        quoteId: z.string().optional(),
        draft: quoteDraftSchema.optional(),
        retire: z.boolean().default(false),
      })
      .parse(input),
    hash = fingerprint(c);
  return prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    const prior = await priorChange(tx, userId, c.operationKey, hash);
    if (prior) return prior;
    if (!season) throw new DirectionError("Save your opening first.");
    if (season.closedAt) throw new DirectionError("This season is closed.");
    const identity = await getCotsIdentity(userId, season.id, tx);
    if (independentRevision === undefined)
      requireVersion(season.version, c.expectedVersion);
    else {
      if (!identity)
        throw new DirectionError("Confirm your inspiration first.");
      requireVersion(identity.row.selectionRevision, independentRevision);
    }
    const old = c.quoteId
      ? await tx.seasonQuote.findFirst({
          where: {
            id: c.quoteId,
            userId,
            seasonId: season.id,
            identityId: identity?.row.id ?? null,
            retiredAt: null,
          },
        })
      : null;
    if (c.quoteId && !old) throw new DirectionError("Quote not found.");
    if (c.retire) {
      if (!old) throw new DirectionError("Quote not found.");
      await tx.seasonQuote.update({
        where: { id: old.id },
        data: { retiredAt: new Date(), featured: false },
      });
    } else {
      if (!c.draft) throw new DirectionError("Provide the quote details.");
      if (
        !old &&
        (await tx.seasonQuote.count({
          where: {
            userId,
            seasonId: season.id,
            identityId: identity?.row.id ?? null,
            retiredAt: null,
          },
        })) >= cotsLimits().quotes
      )
        throw new DirectionError(
          `Keep up to ${cotsLimits().quotes} saved text items per inspiration.`,
        );
      if (c.draft.featured)
        await tx.seasonQuote.updateMany({
          where: { userId, seasonId: season.id, featured: true },
          data: { featured: false },
        });
      const data = {
        ...c.draft,
        identityId: identity?.row.id ?? null,
        rotation: old?.rotation ?? true,
        provenance: jsonValue(provenance(c.draft.provenance, old?.provenance)),
      };
      if (old) await tx.seasonQuote.update({ where: { id: old.id }, data });
      else
        await tx.seasonQuote.create({
          data: { ...data, userId, seasonId: season.id },
        });
    }
    return change(
      tx,
      userId,
      season.id,
      c.operationKey,
      hash,
      c.retire ? "QUOTE_RETIRED" : "QUOTE_SAVED",
      { before: old, after: c },
      independentRevision !== undefined,
    );
  });
}
