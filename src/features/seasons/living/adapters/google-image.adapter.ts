import "server-only";
import sharp from "sharp";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { MAX_UPLOAD_BYTES } from "@/features/seasons/media/services/season-image.service";

export const livingImageModel = "gemini-3.1-flash-image";

export async function generateGoogleLivingImage(input: {
  apiKey: string;
  prompt: string;
  references: Buffer[];
  aspectRatio: "16:9" | "9:16" | "21:9" | "1:1";
  resolution: "1K" | "2K";
}) {
  const parts = [
    { text: input.prompt },
    ...input.references.map((bytes) => ({
      inlineData: { mimeType: "image/webp", data: bytes.toString("base64") },
    })),
  ];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${livingImageModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          responseFormat: {
            image: {
              aspectRatio: input.aspectRatio,
              imageSize: input.resolution,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok)
    throw new DirectionError(
      `Google image generation failed (${response.status}).`,
    );
  const result = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[];
      };
    }[];
  };
  const image = result.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  )?.inlineData;
  if (!image?.data || !image.mimeType?.startsWith("image/"))
    throw new DirectionError("The image provider returned no usable artwork.");
  let bytes = Buffer.from(image.data, "base64");
  if (!bytes.length || bytes.length > 25 * 1024 * 1024)
    throw new DirectionError("The generated image exceeded the upload limit.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    bytes = await sharp(bytes, {
      limitInputPixels: 12_000_000,
      animated: false,
    })
      .resize({
        width: 2200,
        height: 2200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toBuffer();
  }
  if (bytes.length > MAX_UPLOAD_BYTES)
    throw new DirectionError(
      "The generated image is too large for a Season image.",
    );
  return bytes;
}
