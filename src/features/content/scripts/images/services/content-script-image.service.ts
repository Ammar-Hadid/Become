import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  normalizeRasterImage,
  RasterImageError,
} from "@/lib/media/services/raster-image.service";
import { operationKey } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
} from "@/features/direction/services/direction-mutation.service";
import { scriptImageUrl } from "@/features/content/scripts/utils/content-script-url.util";
import type { OwnedScriptImage } from "@/features/content/scripts/types/content-script.types";

const uploadSchema = z
  .object({
    contentId: z.string().min(1).max(100),
    variantId: z.string().min(1).max(100),
    operationKey,
  })
  .strict();

export async function saveScriptImage(
  userId: string,
  input: unknown,
  bytes: Buffer,
): Promise<OwnedScriptImage> {
  const command = uploadSchema.parse(input);
  const owner = await prisma.contentVariant.findFirst({
    where: { id: command.variantId, contentId: command.contentId, userId },
    select: { id: true },
  });
  if (!owner) throw new DirectionError("Script not found.", undefined, 404);
  let image: Awaited<ReturnType<typeof normalizeRasterImage>>;
  try {
    image = await normalizeRasterImage(bytes);
  } catch (error) {
    if (error instanceof RasterImageError)
      throw new DirectionError(error.message, error.field);
    throw error;
  }
  const hash = fingerprint({
    type: "UPLOAD_SCRIPT_IMAGE",
    ...command,
    sha256: image.contentHash,
  });
  const storage = getMediaStorage();
  let storageKey: string | undefined;
  try {
    return await prisma.$transaction(
      async (tx) => {
        await lockDirection(
          tx,
          userId,
          `content-operation:${command.operationKey}`,
        );
        const receipt = await tx.contentMutation.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: command.operationKey },
          },
        });
        if (receipt) {
          if (receipt.fingerprint !== hash)
            throw new DirectionError(
              "This upload was already used for a different image.",
              undefined,
              409,
            );
          return receipt.result as unknown as OwnedScriptImage;
        }
        const parent = await tx.content.updateMany({
          where: { id: command.contentId, userId, archivedAt: null },
          data: { workspaceVersion: { increment: 1 }, updatedAt: new Date() },
        });
        const variant = await tx.contentVariant.updateMany({
          where: {
            id: command.variantId,
            contentId: command.contentId,
            userId,
            archivedAt: null,
          },
          data: { updatedAt: new Date() },
        });
        if (!parent.count || !variant.count)
          throw new DirectionError(
            "Restore this content and variant before adding images.",
            undefined,
            409,
          );
        storageKey = `media/content-scripts/${command.variantId}/${randomUUID()}.webp`;
        await storage.put(storageKey, image.bytes);
        const row = await tx.contentScriptImage.create({
          data: {
            userId,
            contentId: command.contentId,
            variantId: command.variantId,
            storageKey,
            width: image.width,
            height: image.height,
            bytes: image.byteSize,
            sha256: image.contentHash,
          },
        });
        const result = {
          id: row.id,
          url: scriptImageUrl(row.id),
          width: row.width,
          height: row.height,
        };
        await tx.contentMutation.create({
          data: {
            userId,
            operationKey: command.operationKey,
            fingerprint: hash,
            result: jsonValue(result),
          },
        });
        return result;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (storageKey) {
      try {
        if (
          !(await prisma.contentScriptImage.findUnique({
            where: { storageKey },
            select: { id: true },
          }))
        )
          await storage.remove(storageKey);
      } catch {
        console.error(
          "Script image cleanup deferred until its database state can be verified.",
        );
      }
    }
    throw error;
  }
}

export async function readScriptImage(userId: string, id: string) {
  const row = await prisma.contentScriptImage.findFirst({
    where: { id, userId },
  });
  if (!row) return null;
  return {
    bytes: await getMediaStorage().read(row.storageKey),
    sha256: row.sha256,
  };
}
