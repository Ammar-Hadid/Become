import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { directionFailure, directionUser } from "@/features/direction/services/direction-http.service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await directionUser(request);
    const { id } = await context.params;
    const reference = await prisma.livingSeasonSourceImage.findFirst({ where: { id, userId: user.id }, select: { storageKey: true } });
    if (!reference) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const bytes = await getMediaStorage().read(reference.storageKey);
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
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    return directionFailure(error);
  }
}
