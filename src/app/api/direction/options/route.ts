import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getDirectionOptions } from "@/features/direction/queries/direction.query";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request),
      p = new URL(request.url).searchParams;
    return directionResponse(
      await getDirectionOptions(
        user.id,
        p.get("kind") ?? "goal",
        p.get("search") ?? "",
        p.get("cursor") ?? undefined,
        {
          companyId: p.get("companyId") ?? undefined,
          domainId: p.get("domainId") ?? undefined,
        },
      ),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
