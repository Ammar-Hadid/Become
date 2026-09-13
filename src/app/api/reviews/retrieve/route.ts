import {
  directionFailure,
  directionResponse,
  directionUser,
  directionJson,
} from "@/features/direction/services/direction-http.service";
import { getTargetedRetrieval } from "@/features/reviews/retrieval/queries/targeted-retrieval.query";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    return directionResponse(
      await getTargetedRetrieval(user.id, await directionJson(request)),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
