import sharp from "sharp";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { fetchPublicImage } from "@/features/seasons/discovery/services/cots-public-image.service";
import { normalizeSeasonImage } from "@/features/seasons/media/services/season-image.service";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
export const runtime = "nodejs";
const cache = new Map<string, { expires: number; bytes: Buffer }>();
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await directionUser(request),
      { id } = await params;
    const candidate = await prisma.seasonCotsCandidate.findFirst({
      where: { id, userId: user.id },
    });
    if (!candidate) return new Response(null, { status: 404 });
    if (
      candidate.expiresAt < new Date() &&
      !(await prisma.seasonCotsSelection.findFirst({
        where: { userId: user.id, candidateId: id },
      }))
    )
      return new Response(null, { status: 410 });
    const snapshot = candidate.snapshot as unknown as ProviderCandidate;
    if (!snapshot.previewUrl) return new Response(null, { status: 404 });
    const key = `${user.id}:${id}`,
      cached = cache.get(key);
    let bytes = cached && cached.expires > Date.now() ? cached.bytes : null;
    if (!bytes) {
      const normalized = await normalizeSeasonImage(
        await fetchPublicImage(snapshot.previewUrl, 2 * 1024 * 1024),
      );
      bytes = await sharp(normalized.bytes)
        .resize({
          width: 480,
          height: 600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer();
      if (cache.size >= 40) cache.delete(cache.keys().next().value!);
      cache.set(key, { bytes, expires: Date.now() + 60_000 });
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return directionFailure(error);
  }
}
