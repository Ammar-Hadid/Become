import {
  RASTER_IMAGE_CONTENT_TYPES,
  RASTER_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/media/constants/raster-image.constants";
import type { ArtworkUploadAsset } from "@/components/ui/artwork-upload/artwork-upload.component";
export async function readPreviewUpload(
  file: File,
  orientation: "wide" | "portrait" | "square",
): Promise<ArtworkUploadAsset> {
  if (
    !RASTER_IMAGE_CONTENT_TYPES.has(file.type) ||
    file.size > RASTER_IMAGE_MAX_UPLOAD_BYTES ||
    !file.size
  )
    throw new Error("Choose a still JPEG, PNG, WebP or AVIF image up to 6 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. Choose another file.");
  });
  try {
    if (bitmap.width * bitmap.height > 12_000_000)
      throw new Error("Choose an image under 12 megapixels.");
    const ratio = bitmap.width / bitmap.height;
    if (orientation === "wide" && ratio < 1.4)
      throw new Error("Choose a wide desktop composition.");
    if (orientation === "portrait" && ratio > 0.85)
      throw new Error("Choose a vertical mobile composition.");
    if (orientation === "square" && (bitmap.width < 512 || bitmap.height < 512))
      throw new Error("Choose a portrait at least 512 pixels wide and tall.");
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      href: canvas.toDataURL("image/webp", 0.86),
      filename: file.name,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}
