import { directionFailure, directionResponse, directionUser } from "@/features/direction/services/direction-http.service";
import { getNexoSeasonAnalysis } from "@/features/nexo/services/nexo-season-analysis.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    return directionResponse(await getNexoSeasonAnalysis(user.id));
  } catch (error) {
    return directionFailure(error);
  }
}
