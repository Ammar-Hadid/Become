import sharp from "sharp";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
export const seasonPreviewKey = (storageKey: string) =>
  storageKey.replace(/\.webp$/, "-preview.webp");
export async function prepareSeasonImagePreview(
  storageKey: string,
  normalized: Buffer,
) {
  const key = seasonPreviewKey(storageKey);
  const bytes = await sharp(normalized, { limitInputPixels: 12_000_000 })
    .resize({
      width: 480,
      height: 600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 76 })
    .toBuffer();
  try {
    await getMediaStorage().put(key, bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return key;
}
