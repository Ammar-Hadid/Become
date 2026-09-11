import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  normalizeSeasonImage,
  normalizeSeasonImagePreview,
  MAX_UPLOAD_BYTES,
} from "./season-image.service";
describe("season raster boundary", () => {
  it("re-encodes a valid image with dimensions and no embedded metadata", async () => {
    const bytes = await sharp({
      create: { width: 20, height: 30, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    const result = await normalizeSeasonImage(bytes),
      metadata = await sharp(result.bytes).metadata();
    expect(result).toMatchObject({
      mimeType: "image/webp",
      width: 20,
      height: 30,
    });
    expect(metadata.exif).toBeUndefined();
    expect(result.contentHash).toHaveLength(64);
  });
  it("accepts AVIF input and normalizes it to the private WebP format", async () => {
    const bytes = await sharp({
      create: { width: 24, height: 32, channels: 3, background: "#654321" },
    })
      .avif()
      .toBuffer();
    const result = await normalizeSeasonImage(bytes);
    expect(result).toMatchObject({
      mimeType: "image/webp",
      width: 24,
      height: 32,
    });
    expect((await sharp(result.bytes).metadata()).format).toBe("webp");
  });
  it("creates a 600-pixel single-pass discovery preview", async () => {
    const bytes = await sharp({
      create: { width: 800, height: 1000, channels: 3, background: "#234567" },
    })
      .jpeg()
      .toBuffer();
    const preview = await normalizeSeasonImagePreview(bytes);
    expect(await sharp(preview).metadata()).toMatchObject({
      format: "webp",
      width: 600,
      height: 750,
    });
  });
  it("rejects non-raster contents and oversized uploads before storage", async () => {
    await expect(
      normalizeSeasonImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        ),
      ),
    ).rejects.toThrow();
    await expect(
      normalizeSeasonImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1)),
    ).rejects.toThrow("6 MB");
  });
});
