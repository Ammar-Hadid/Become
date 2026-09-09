import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getGoalView } from "@/features/direction/queries/direction.query";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await directionUser(request),
      { id } = await context.params;
    const goal = await getGoalView(user.id, id);
    return directionResponse(goal ?? { error: "Goal not found." }, {
      status: goal ? 200 : 404,
    });
  } catch (error) {
    return directionFailure(error);
  }
}
