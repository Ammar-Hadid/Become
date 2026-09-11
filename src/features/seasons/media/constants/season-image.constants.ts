export const SEASON_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export const SEASON_IMAGE_FORMAT_LABEL = "JPEG, PNG, WebP, or AVIF";

export const SEASON_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

// Sharp reports AVIF through its HEIF decoder with AV1 compression.
export const SEASON_IMAGE_DECODER_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "heif",
]);
