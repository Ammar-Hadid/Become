import {
  directionFailure,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { readScriptImage } from "@/features/content/scripts/images/services/content-script-image.service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  try {
    const user = await directionUser(request);
    const { imageId } = await params;
    const image = await readScriptImage(user.id, imageId);
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ETag: `"${image.sha256}"`,
      },
    });
  } catch (error) {
    return directionFailure(error);
  }
}
