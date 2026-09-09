import sharp from "sharp";
import { createHash } from "node:crypto";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export async function normalizeSeasonImage(input: Buffer) {
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
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      throw new DirectionError(
        "Choose a still JPEG, PNG, or WebP image.",
        "file",
      );
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
      contentHash: createHash("sha256").update(data).digest("hex"),
    };
  } catch (error) {
    if (error instanceof DirectionError) throw error;
    throw new DirectionError(
      "This image could not be decoded safely. Choose a still JPEG, PNG, or WebP image under 12 megapixels.",
      "file",
    );
  }
}
