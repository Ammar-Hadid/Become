import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
  directionJson,
} from "@/features/direction/services/direction-http.service";
import { previewDirection } from "@/features/direction/measurements/queries/direction-preview.query";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    return directionResponse({
      evaluation: await previewDirection(user.id, await directionJson(request)),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
