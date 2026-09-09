import { directionResponse } from "@/features/direction/services/direction-http.service";
import { z } from "zod";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getCriterionSources } from "@/features/direction/measurements/queries/direction-preview.query";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await directionUser(request),
      { id } = await context.params;
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(new URL(request.url).searchParams.get("cursor") ?? 0);
    const evaluation = await getCriterionSources(user.id, id, offset);
    return directionResponse(evaluation ?? { error: "Criterion not found." }, {
      status: evaluation ? 200 : 404,
    });
  } catch (error) {
    return directionFailure(error);
  }
}
