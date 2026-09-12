import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionResponse,
  directionFailure,
  directionJson,
} from "@/features/direction/services/direction-http.service";
import {
  readContentMedia,
  saveContentMedia,
} from "@/features/content/media/services/content-media.service";
import { getContentWorkspace } from "@/features/content/queries/content.query";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await directionUser(request),
      { id } = await context.params,
      row = await readContentMedia(u.id, id);
    if (!row)
      return directionResponse({ error: "Image not found." }, { status: 404 });
    return new Response(new Uint8Array(row.bytes), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return directionFailure(e);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let userId: string | undefined,
    contentId: string | undefined,
    variantId: string | undefined;
  try {
    const u = await directionUser(request, true);
    userId = u.id;
    const { id } = await context.params;
    variantId = id;
    const raw = await directionJson(request);
    const input = raw && typeof raw === "object" ? raw : {};
    if ("contentId" in input && typeof input.contentId === "string")
      contentId = input.contentId;
    const result = await saveContentMedia(u.id, { ...input, variantId: id });
    revalidatePath("/content", "layout");
    return directionResponse({
      error: null,
      ...result,
      workspace: await getContentWorkspace(u.id, result.contentId, {
        variantId,
      }),
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
