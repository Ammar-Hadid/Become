import { randomUUID, createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  jsonValue,
  lockDirection,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { getCotsCollection } from "@/features/seasons/discovery/queries/cots-collection.query";
import { fetchPublicImage } from "@/features/seasons/discovery/services/cots-public-image.service";
import { normalizeSeasonImage } from "@/features/seasons/media/services/season-image.service";
import {
  prepareSeasonImagePreview,
  seasonPreviewKey,
} from "@/features/seasons/media/services/season-image-preview.service";
import { discoveredProvenance } from "@/features/seasons/discovery/services/cots-curation.service";
import {
  cotsLimits,
  cotsProviderEnabled,
} from "@/features/seasons/discovery/config/cots-provider.config";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { resolveZerochanImage } from "@/features/seasons/discovery/services/cots-zerochan-image.service";

export async function importCotsSelection(
  userId: string,
  input: unknown,
  retry = false,
) {
  const c = seasonIdentitySchema
    .extend({ selectionId: z.string().min(1).max(100) })
    .parse(input);
  const claim = await prisma.$transaction(async (tx) => {
    await lockDirection(tx, userId, "cots-imports");
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError("This season is not editable.");
    const job = await tx.seasonCotsSelection.findFirst({
      where: { id: c.selectionId, userId, seasonId: season.id },
    });
    if (!job)
      throw new DirectionError("This import was not found.", undefined, 404);
    if (job.status === "READY") return null;
    if (retry && job.status === "FAILED") {
      await tx.seasonCotsSelection.update({
        where: { id: job.id },
        data: { status: "PENDING", error: null },
      });
      return null;
    }
    if (!(
      job.status === "PENDING" ||
      (job.status === "IMPORTING" &&
        job.leaseUntil &&
        job.leaseUntil <= new Date())
    ))
      return null;
    if (
      (await tx.seasonCotsSelection.count({
        where: { userId, status: "IMPORTING", leaseUntil: { gt: new Date() } },
      })) >= 2
    )
      return null;
    const token = randomUUID();
    return tx.seasonCotsSelection.update({
      where: { id: job.id },
      data: {
        status: "IMPORTING",
        leaseToken: token,
        leaseUntil: new Date(Date.now() + 60_000),
        attempts: { increment: 1 },
        error: null,
        storageKey:
          job.storageKey ?? `media/seasons/${season.id}/${randomUUID()}.webp`,
      },
    });
  });
  if (claim) {
    const storage = getMediaStorage();
    try {
      let snapshot = claim.snapshot as unknown as ProviderCandidate;
      if (!cotsProviderEnabled(snapshot.provider))
        throw new DirectionError(
          "This source is currently disabled. Enable it before retrying the import.",
        );
      if (
        snapshot.provider === "brave" &&
        process.env.COTS_BRAVE_STORAGE_ALLOWED !== "true"
      )
        throw new DirectionError(
          "Brave storage permission is required before importing this selection.",
        );
      if (
        snapshot.provider === "zerochan" &&
        !snapshot.originalUrl &&
        /^\d+$/.test(snapshot.externalId)
      ) {
        const detail = await resolveZerochanImage(snapshot);
        snapshot = {
          ...snapshot,
          originalUrl: detail.originalUrl,
          credit: detail.credit,
          sourceDetail:
            `${snapshot.sourceDetail} · Original references: ${detail.references.join(" ")}`.slice(
              0,
              1500,
            ),
        };
        await prisma.seasonCotsSelection.updateMany({
          where: { id: claim.id, userId, leaseToken: claim.leaseToken },
          data: { snapshot: jsonValue(snapshot) },
        });
      }
      if (snapshot.form !== "IMAGE" || !snapshot.originalUrl)
        throw new DirectionError(
          "This selection has no downloadable original.",
        );
      let bytes: Buffer,
        prepared = false;
      try {
        bytes = await storage.read(claim.storageKey!);
        prepared = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        bytes = await fetchPublicImage(snapshot.originalUrl);
      }
      const image = prepared
        ? await (async () => {
            const info = await sharp(bytes, {
              limitInputPixels: 12_000_000,
            }).metadata();
            if (
              info.format !== "webp" ||
              !info.width ||
              !info.height ||
              bytes.length > 3 * 1024 * 1024
            )
              throw new DirectionError(
                "The prepared import could not be validated.",
              );
            return {
              bytes,
              mimeType: "image/webp",
              byteSize: bytes.length,
              width: info.width,
              height: info.height,
              hasAlpha: info.hasAlpha,
              contentHash: createHash("sha256").update(bytes).digest("hex"),
            };
          })()
        : await normalizeSeasonImage(bytes);
      // A prepared file is immutable. A retry may find it after process termination.
      try {
        await storage.put(claim.storageKey!, image.bytes);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      const previewStorageKey = await prepareSeasonImagePreview(
        claim.storageKey!,
        image.bytes,
      );
      await prisma.$transaction(async (tx) => {
        const season = await lockSeason(tx, userId, c.year, c.quarter);
        const current = await tx.seasonCotsSelection.findUnique({
          where: { id: claim.id },
        });
        if (
          !season ||
          season.closedAt ||
          !current ||
          current.leaseToken !== claim.leaseToken ||
          current.status !== "IMPORTING"
        )
          throw new DirectionError("This import changed while it was running.");
        const identity = await tx.seasonCotsIdentity.findFirst({
          where: { id: claim.identityId, userId, seasonId: season.id },
        });
        if (!identity)
          throw new DirectionError("The original inspiration is unavailable.");
        if (
          (await tx.seasonMediaUse.count({
            where: {
              userId,
              seasonId: season.id,
              identityId: identity.id,
              retiredAt: null,
            },
          })) >= cotsLimits().images
        )
          throw new DirectionError(
            "The image collection is full. Retire an image before retrying.",
          );
        const existing = await tx.seasonMedia.findFirst({
          where: { userId, contentHash: image.contentHash },
          orderBy: { createdAt: "asc" },
        });
        const { bytes: ignored, ...metadata } = image;
        void ignored;
        const media =
          existing ??
          (await tx.seasonMedia.create({
            data: {
              userId,
              seasonId: season.id,
              storageKey: claim.storageKey!,
              previewStorageKey,
              ...metadata,
              alt: snapshot.title.slice(0, 1000) || identity.displayName,
              decorative: false,
              poster: false,
              provenance: jsonValue(
                discoveredProvenance(snapshot, claim.contextId),
              ),
            },
          }));
        if (current.desiredPoster && identity.active)
          await tx.seasonMediaUse.updateMany({
            where: { userId, seasonId: season.id },
            data: { poster: false },
          });
        await tx.seasonMediaUse.upsert({
          where: {
            seasonId_mediaId_identityId: {
              seasonId: season.id,
              mediaId: media.id,
              identityId: identity.id,
            },
          },
          create: {
            userId,
            seasonId: season.id,
            identityId: identity.id,
            mediaId: media.id,
            poster: current.desiredPoster && identity.active,
          },
          update: {
            retiredAt: null,
            ...(current.desiredPoster && identity.active
              ? { poster: true }
              : {}),
          },
        });
        await tx.seasonCotsSelection.update({
          where: { id: claim.id },
          data: {
            status: "READY",
            mediaId: media.id,
            leaseToken: null,
            leaseUntil: null,
            error: null,
          },
        });
        await tx.seasonCotsIdentity.update({
          where: { id: identity.id },
          data: { selectionRevision: { increment: 1 } },
        });
      });
      const committed = await prisma.seasonMedia.findUnique({
        where: { storageKey: claim.storageKey! },
      });
      if (!committed) {
        await storage.remove(claim.storageKey!);
        await storage.remove(seasonPreviewKey(claim.storageKey!));
      }
    } catch (error) {
      // Do not remove a prepared file after an uncertain commit. Its durable job tracks recovery.
      await prisma.seasonCotsSelection.updateMany({
        where: {
          id: claim.id,
          userId,
          leaseToken: claim.leaseToken,
          status: "IMPORTING",
        },
        data: {
          status: "FAILED",
          leaseUntil: null,
          leaseToken: null,
          error:
            error instanceof DirectionError
              ? error.message
              : "This image could not be saved. Your existing poster is preserved; retry or choose another source.",
        },
      });
    }
  }
  return getCotsCollection(userId, c.year, c.quarter);
}
