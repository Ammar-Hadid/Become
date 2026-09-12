import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  normalizeRasterImage,
  RasterImageError,
} from "@/lib/media/services/raster-image.service";
import { contentIdSchema } from "@/features/content/schemas/content.schema";
import { operationKey } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
} from "@/features/direction/services/direction-mutation.service";
const command = z
  .object({
    contentId: contentIdSchema,
    variantId: contentIdSchema,
    expectedMediaVersion: z.coerce.number().int().positive(),
    operationKey,
  })
  .strict();
export async function saveContentMedia(
  userId: string,
  input: unknown,
  bytes?: Buffer,
) {
  const c = command.parse(input);
  if (
    !(await prisma.contentVariant.findFirst({
      where: { id: c.variantId, contentId: c.contentId, userId },
    }))
  )
    throw new DirectionError("Version not found.", undefined, 404);
  let image: Awaited<ReturnType<typeof normalizeRasterImage>> | undefined;
  try {
    image = bytes ? await normalizeRasterImage(bytes) : undefined;
  } catch (e) {
    if (e instanceof RasterImageError)
      throw new DirectionError(e.message, e.field);
    throw e;
  }
  const hash = fingerprint({
      type: bytes ? "CONTENT_MEDIA_UPLOAD" : "CONTENT_MEDIA_REMOVE",
      ...c,
      sha256: image?.contentHash,
    }),
    storage = getMediaStorage();
  let createdKey: string | null = null;
  try {
    return await prisma.$transaction(
      async (tx) => {
        await lockDirection(tx, userId, `content-operation:${c.operationKey}`);
        const prior = await tx.contentMutation.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: c.operationKey },
          },
        });
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This submission was already used for another change.",
              undefined,
              409,
            );
          return prior.result as { id: string; contentId: string };
        }
        await lockDirection(tx, userId, `content:${c.contentId}`);
        await tx.content.updateMany({
          where: { id: c.contentId, userId },
          data: { workspaceVersion: { increment: 1 }, updatedAt: new Date() },
        });
        const variant = await tx.contentVariant.findFirst({
          where: { id: c.variantId, contentId: c.contentId, userId },
          include: { content: true },
        });
        if (!variant)
          throw new DirectionError("Version not found.", undefined, 404);
        if (variant.archivedAt || variant.content.archivedAt)
          throw new DirectionError(
            "Restore this variant before changing its thumbnail.",
          );
        requireVersion(variant.mediaVersion, c.expectedMediaVersion);
        await tx.contentMedia.updateMany({
          where: { userId, variantId: variant.id, retiredAt: null },
          data: { retiredAt: new Date() },
        });
        let mediaId: string | undefined;
        if (image) {
          createdKey = `media/content/${variant.id}/${randomUUID()}.webp`;
          await storage.put(createdKey, image.bytes);
          const media = await tx.contentMedia.create({
            data: {
              userId,
              variantId: variant.id,
              storageKey: createdKey,
              width: image.width,
              height: image.height,
              bytes: image.byteSize,
              sha256: image.contentHash,
            },
          });
          mediaId = media.id;
        }
        await tx.contentVariant.update({
          where: { id: variant.id },
          data: { mediaVersion: { increment: 1 } },
        });
        const result = {
          id: mediaId ?? variant.id,
          contentId: c.contentId,
          mediaVersion: variant.mediaVersion + 1,
        };
        await tx.contentMutation.create({
          data: {
            userId,
            operationKey: c.operationKey,
            fingerprint: hash,
            result: jsonValue(result),
          },
        });
        return result;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (createdKey) {
      try {
        if (
          !(await prisma.contentMedia.findUnique({
            where: { storageKey: createdKey },
            select: { id: true },
          }))
        )
          await storage.remove(createdKey);
      } catch {
        console.error(
          "Content image cleanup deferred until database state can be verified.",
        );
      }
    }
    throw error;
  }
}
export async function readContentMedia(userId: string, id: string) {
  const row = await prisma.contentMedia.findFirst({ where: { id, userId } });
  if (!row) return null;
  return {
    bytes: await getMediaStorage().read(row.storageKey),
    sha256: row.sha256,
  };
}
