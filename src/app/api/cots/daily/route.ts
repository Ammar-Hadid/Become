import { directionFailure, directionJson, directionResponse, directionUser } from "@/features/direction/services/direction-http.service";
import { NexoError } from "@/features/nexo/types/nexo.types";
import { cotsDailyAreaSchema, getOrGenerateCotsDailyMessage } from "@/features/seasons/living/services/cots-daily-message.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const area = cotsDailyAreaSchema.parse((await directionJson(request, 1024) as { area?: unknown }).area);
    return directionResponse(await getOrGenerateCotsDailyMessage(user.id, area));
  } catch (error) {
    if (error instanceof NexoError) return directionResponse({ status: "PREVIEW", reason: error.message });
    return directionFailure(error);
  }
}
