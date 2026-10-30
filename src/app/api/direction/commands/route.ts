import { directionResponse } from "@/features/direction/services/direction-http.service";
import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionFailure,
  directionJson,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { saveGoal } from "@/features/direction/services/goal.service";
import { saveSeason } from "@/features/seasons/services/season.service";
import { saveExperiment } from "@/features/direction/services/experiment.service";
import { changeDirectionLifecycle } from "@/features/direction/services/direction-lifecycle.service";
import { assessCriterion } from "@/features/direction/evidence/services/criterion-assessment.service";
import { changeSeasonLifecycle } from "@/features/seasons/services/season-lifecycle.service";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const { type, ...input } = z
      .object({ type: z.string() })
      .passthrough()
      .parse(await directionJson(request));
    let result;
    if (type === "SAVE_SEASON") result = await saveSeason(user.id, input);
    else if (type === "SAVE_GOAL") result = await saveGoal(user.id, input);
    else if (type === "SAVE_EXPERIMENT")
      result = await saveExperiment(user.id, input);
    else if (type === "DIRECTION_LIFECYCLE")
      result = await changeDirectionLifecycle(user.id, input);
    else if (type === "ASSESS_CRITERION")
      result = await assessCriterion(user.id, input);
    else if (type === "SEASON_LIFECYCLE")
      result = await changeSeasonLifecycle(user.id, input);
    else throw new DirectionError("This action is not available.");
    revalidatePath("/direction", "layout");
    revalidatePath("/");
    return directionResponse({
      error: null,
      ...result,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
