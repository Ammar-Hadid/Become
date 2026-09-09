import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getSeasonView } from "@/features/seasons/queries/season.query";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string; quarter: string }> },
) {
  try {
    const user = await directionUser(request),
      p = await params;
    return directionResponse(
      await getSeasonView(user.id, Number(p.year), Number(p.quarter)),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
