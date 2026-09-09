import { directionResponse } from "@/features/direction/services/direction-http.service";
import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionFailure,
  boundedBody,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { uploadSeasonMedia } from "@/features/seasons/media/services/season-media.service";
import { MAX_UPLOAD_BYTES } from "@/features/seasons/media/services/season-image.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const body = await boundedBody(request, MAX_UPLOAD_BYTES + 32000);
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file"),
      raw = form.get("input");
    if (!(file instanceof File) || typeof raw !== "string")
      throw new DirectionError("Choose an image and provide its details.");
    const result = await uploadSeasonMedia(
      user.id,
      JSON.parse(raw),
      Buffer.from(await file.arrayBuffer()),
    );
    revalidatePath("/direction", "layout");
    revalidatePath("/");
    return directionResponse({
      error: null,
      ...result,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
