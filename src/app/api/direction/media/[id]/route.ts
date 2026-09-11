import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await directionUser(request),
      { id } = await context.params;
    const media = await prisma.seasonMedia.findFirst({
      where: { id, userId: user.id },
    });
    if (!media)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    const storageKey =
      new URL(request.url).searchParams.get("size") === "preview"
        ? media.previewStorageKey
        : media.storageKey;
    if (!storageKey)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    const bytes = await getMediaStorage().read(storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    return directionFailure(error);
  }
}
