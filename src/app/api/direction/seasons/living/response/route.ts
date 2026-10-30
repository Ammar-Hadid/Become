import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { previewCharacterResponse } from "@/features/seasons/living/services/living-character-response-preview.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    return directionResponse(
      await previewCharacterResponse(user.id, await directionJson(request)),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
