import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionResponse,
  directionFailure,
  boundedBody,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { MAX_UPLOAD_BYTES } from "@/lib/media/services/raster-image.service";
import { saveContentMedia } from "@/features/content/media/services/content-media.service";
import { getContentWorkspace } from "@/features/content/queries/content.query";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let userId: string | undefined,
    contentId: string | undefined,
    variantId: string | undefined;
  try {
    const u = await directionUser(request, true);
    userId = u.id;
    const bytes = await boundedBody(request, MAX_UPLOAD_BYTES + 32000);
    const form = await new Response(bytes, {
        headers: { "content-type": request.headers.get("content-type") ?? "" },
      }).formData(),
      file = form.get("file");
    if (!(file instanceof File))
      throw new DirectionError("Choose a thumbnail image.", "file");
    contentId = String(form.get("contentId") ?? "");
    variantId = String(form.get("variantId") ?? "");
    const result = await saveContentMedia(
      u.id,
      {
        contentId,
        variantId,
        expectedMediaVersion: form.get("expectedMediaVersion"),
        operationKey: form.get("operationKey"),
      },
      Buffer.from(await file.arrayBuffer()),
    );
    revalidatePath("/content", "layout");
    return directionResponse({
      error: null,
      ...result,
      workspace: await getContentWorkspace(u.id, contentId, { variantId }),
      savedAt: new Date().toISOString(),
    });
  } catch (e) {
    const response = directionFailure(e);
    if (response.status === 409 && userId && contentId)
      return directionResponse(
        {
          ...(await response.json()),
          workspace: await getContentWorkspace(userId, contentId, {
            variantId,
          }),
        },
        { status: 409 },
      );
    return response;
  }
}
