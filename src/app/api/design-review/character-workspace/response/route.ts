import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { previewCharacterResponse } from "@/features/seasons/living/services/living-character-response-preview.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    if (user.email !== "demotest@gmail.com")
      throw new DirectionError(
        "This preview belongs to the demo account.",
        undefined,
        403,
      );
    return directionResponse(
      await previewCharacterResponse(user.id, await directionJson(request)),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
