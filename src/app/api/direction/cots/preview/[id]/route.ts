import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { fetchPublicImage } from "@/features/seasons/discovery/services/cots-public-image.service";
import { resolveZerochanImage } from "@/features/seasons/discovery/services/cots-zerochan-image.service";
import { normalizeSeasonImagePreview } from "@/features/seasons/media/services/season-image.service";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
export const runtime = "nodejs";
const previewCacheMilliseconds = 15 * 60_000;
const previewCacheSeconds = previewCacheMilliseconds / 1000;
const cache = new Map<string, { expires: number; bytes: Buffer }>();

async function fetchCandidatePreview(
  candidate: ProviderCandidate,
  large: boolean,
) {
  if (large && candidate.provider === "zerochan")
    try {
      const detail = await resolveZerochanImage(candidate);
      return await fetchPublicImage(detail.largeUrl, 2 * 1024 * 1024);
    } catch {
      // A higher-quality rendition is optional; keep the provider thumbnail usable.
    }
  return fetchPublicImage(candidate.previewUrl!, 2 * 1024 * 1024);
}

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
    const large =
        snapshot.provider === "zerochan" &&
        new URL(request.url).searchParams.get("size") === "large",
      key = `${user.id}:${id}:${large ? "large" : "thumbnail"}`,
      cached = cache.get(key);
    let bytes = cached && cached.expires > Date.now() ? cached.bytes : null;
    if (!bytes) {
      bytes = await normalizeSeasonImagePreview(
        await fetchCandidatePreview(snapshot, large),
      );
      if (cache.size >= 40) cache.delete(cache.keys().next().value!);
      cache.set(key, {
        bytes,
        expires: Date.now() + previewCacheMilliseconds,
      });
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
        "Cache-Control": `private, max-age=${previewCacheSeconds}`,
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return directionFailure(error);
  }
}
