import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getExperimentView } from "@/features/direction/queries/direction.query";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await directionUser(request),
      { id } = await context.params;
    const experiment = await getExperimentView(user.id, id);
    return directionResponse(experiment ?? { error: "Experiment not found." }, {
      status: experiment ? 200 : 404,
    });
  } catch (error) {
    return directionFailure(error);
  }
}
