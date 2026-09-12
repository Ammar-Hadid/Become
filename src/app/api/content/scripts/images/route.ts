import {
  boundedBody,
  directionFailure,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { SCRIPT_MAX_IMAGE_BYTES } from "@/features/content/scripts/constants/content-script.constants";
import { saveScriptImage } from "@/features/content/scripts/images/services/content-script-image.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const bytes = await boundedBody(request, SCRIPT_MAX_IMAGE_BYTES + 32000);
    const form = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new DirectionError("Choose an image.", "file");
    const image = await saveScriptImage(
      user.id,
      {
        contentId: form.get("contentId"),
        variantId: form.get("variantId"),
        operationKey: form.get("operationKey"),
      },
      Buffer.from(await file.arrayBuffer()),
    );
    return directionResponse({ error: null, image });
  } catch (error) {
    return directionFailure(error);
  }
}
