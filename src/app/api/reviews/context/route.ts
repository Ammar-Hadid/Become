import {
  directionFailure,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { getCurrentContext } from "@/features/reviews/retrieval/queries/current-context.query";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request),
      params = new URL(request.url).searchParams;
    return directionResponse(
      await getCurrentContext(
        user.id,
        params.has("domains")
          ? { domains: params.get("domains")!.split(",") }
          : {},
      ),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
