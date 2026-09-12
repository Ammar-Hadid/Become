import sharp, { type Sharp } from "sharp";
import { createHash } from "node:crypto";
export class RasterImageError extends Error {
  constructor(
    message: string,
    public readonly field = "file",
  ) {
    super(message);
  }
}
import {
  RASTER_IMAGE_DECODER_FORMATS,
  RASTER_IMAGE_FORMAT_LABEL,
  RASTER_IMAGE_MAX_UPLOAD_BYTES as MAX_UPLOAD_BYTES,
} from "@/lib/media/constants/raster-image.constants";
export { MAX_UPLOAD_BYTES };

async function transformRasterImage<T>(
  input: Buffer,
  transform: (image: Sharp) => Promise<T>,
) {
  if (!input.length || input.length > MAX_UPLOAD_BYTES)
    throw new RasterImageError("Choose an image up to 6 MB.", "file");
  try {
    const image = sharp(input, {
      limitInputPixels: 12_000_000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !RASTER_IMAGE_DECODER_FORMATS.has(metadata.format ?? "") ||
      (metadata.format === "heif" && metadata.compression !== "av1") ||
      (metadata.pages ?? 1) > 1
    )
      throw new RasterImageError(
        `Choose a still ${RASTER_IMAGE_FORMAT_LABEL} image.`,
        "file",
      );
    return await transform(image);
  } catch (error) {
    if (error instanceof RasterImageError) throw error;
    throw new RasterImageError(
      `This image could not be decoded safely. Choose a still ${RASTER_IMAGE_FORMAT_LABEL} image under 12 megapixels.`,
      "file",
    );
  }
}

export async function normalizeRasterImage(input: Buffer) {
  return transformRasterImage(input, async (image) => {
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
      throw new RasterImageError(
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

export async function normalizeRasterImagePreview(input: Buffer) {
  return transformRasterImage(input, (image) =>
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
