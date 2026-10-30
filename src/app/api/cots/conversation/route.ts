import { directionFailure, directionJson, directionResponse, directionUser } from "@/features/direction/services/direction-http.service";
import { converseWithCots } from "@/features/seasons/living/services/cots-conversation.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    return directionResponse(await converseWithCots(user.id, await directionJson(request)));
  } catch (error) {
    return directionFailure(error);
  }
}
