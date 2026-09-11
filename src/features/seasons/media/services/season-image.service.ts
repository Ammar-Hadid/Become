import sharp, { type Sharp } from "sharp";
import { createHash } from "node:crypto";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import {
  SEASON_IMAGE_DECODER_FORMATS,
  SEASON_IMAGE_FORMAT_LABEL,
} from "@/features/seasons/media/constants/season-image.constants";
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

async function transformSeasonImage<T>(
  input: Buffer,
  transform: (image: Sharp) => Promise<T>,
) {
  if (!input.length || input.length > MAX_UPLOAD_BYTES)
    throw new DirectionError("Choose an image up to 6 MB.", "file");
  try {
    const image = sharp(input, {
      limitInputPixels: 12_000_000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !SEASON_IMAGE_DECODER_FORMATS.has(metadata.format ?? "") ||
      (metadata.format === "heif" && metadata.compression !== "av1") ||
      (metadata.pages ?? 1) > 1
    )
      throw new DirectionError(
        `Choose a still ${SEASON_IMAGE_FORMAT_LABEL} image.`,
        "file",
      );
    return await transform(image);
  } catch (error) {
    if (error instanceof DirectionError) throw error;
    throw new DirectionError(
      `This image could not be decoded safely. Choose a still ${SEASON_IMAGE_FORMAT_LABEL} image under 12 megapixels.`,
      "file",
    );
  }
}

export async function normalizeSeasonImage(input: Buffer) {
  return transformSeasonImage(input, async (image) => {
    const { data, info } = await image
      .autoOrient()
      .resize({
        width: 2200,
        height: 2200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > 3 * 1024 * 1024)
      throw new DirectionError(
        "This image is too detailed. Choose a smaller image.",
        "file",
      );
    return {
      bytes: data,
      mimeType: "image/webp",
      byteSize: data.length,
      width: info.width,
      height: info.height,
      hasAlpha: info.channels === 4,
      contentHash: createHash("sha256").update(data).digest("hex"),
    };
  });
}

export async function normalizeSeasonImagePreview(input: Buffer) {
  return transformSeasonImage(input, (image) =>
    image
      .autoOrient()
      .resize({
        width: 600,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer(),
  );
}
