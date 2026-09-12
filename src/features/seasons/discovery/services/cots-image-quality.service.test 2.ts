import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { areCotsImageFingerprintsNear } from "@/features/seasons/discovery/utils/cots-image-quality.util";
import { createCotsImageFingerprint } from "./cots-image-quality.service";

const portrait = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
    <rect width="400" height="500" fill="#ece7dc"/>
    <circle cx="210" cy="145" r="72" fill="#25262a"/>
    <path d="M105 440 C115 270 300 260 325 440 Z" fill="#555b63"/>
    <rect x="52" y="54" width="42" height="240" fill="#b87931"/>
    <circle cx="310" cy="92" r="28" fill="#d7a74d"/>
  </svg>
`);

const distinctPortrait = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
    <rect width="400" height="500" fill="#e6e1d8"/>
    <circle cx="125" cy="170" r="66" fill="#30333a"/>
    <path d="M18 455 C45 285 205 275 252 455 Z" fill="#656b72"/>
    <rect x="322" y="35" width="34" height="290" fill="#9b6427"/>
    <circle cx="282" cy="350" r="38" fill="#c99542"/>
  </svg>
`);

describe("COTS perceptual image fingerprints", () => {
  it("recognizes resized and lightly cropped renditions without merging a distinct image", async () => {
    const original = await sharp(portrait).png().toBuffer();
    const resized = await sharp(original)
      .resize(200, 250)
      .jpeg({ quality: 72 })
      .toBuffer();
    const cropped = await sharp(original)
      .extract({ left: 8, top: 10, width: 384, height: 480 })
      .resize(400, 500)
      .webp({ quality: 78 })
      .toBuffer();
    const distinct = await sharp(distinctPortrait).png().toBuffer();
    const [originalHash, resizedHash, croppedHash, distinctHash] =
      await Promise.all(
        [original, resized, cropped, distinct].map(createCotsImageFingerprint),
      );

    expect(areCotsImageFingerprintsNear(originalHash, resizedHash)).toBe(true);
    expect(areCotsImageFingerprintsNear(originalHash, croppedHash)).toBe(true);
    expect(areCotsImageFingerprintsNear(originalHash, distinctHash)).toBe(
      false,
    );
  });
});
