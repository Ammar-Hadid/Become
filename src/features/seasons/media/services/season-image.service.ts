import {
  normalizeRasterImage,
  normalizeRasterImagePreview,
  RasterImageError,
} from "@/lib/media/services/raster-image.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
export { MAX_UPLOAD_BYTES } from "@/lib/media/services/raster-image.service";
export async function normalizeSeasonImage(input: Buffer) {
  try {
    return await normalizeRasterImage(input);
  } catch (e) {
    if (e instanceof RasterImageError)
      throw new DirectionError(e.message, e.field);
    throw e;
  }
}
export async function normalizeSeasonImagePreview(input: Buffer) {
  try {
    return await normalizeRasterImagePreview(input);
  } catch (e) {
    if (e instanceof RasterImageError)
      throw new DirectionError(e.message, e.field);
    throw e;
  }
}
