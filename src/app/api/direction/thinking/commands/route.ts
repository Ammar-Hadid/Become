import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionJson,
  directionResponse,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { executeThinkingCommand } from "@/features/direction/thinking/services/thinking-mutation.service";
import {
  getIdea,
  getDecision,
} from "@/features/direction/thinking/queries/thinking.query";

export async function POST(request: Request) {
  let userId: string | undefined, input: unknown;
  try {
    const user = await directionUser(request, true);
    userId = user.id;
    input = await directionJson(request);
    const result = await executeThinkingCommand(user.id, input);
    revalidatePath("/direction", "layout");
    revalidatePath("/content", "layout");
    revalidatePath("/");
    return directionResponse({
      error: null,
      ...result,
      idea: result.ideaId ? await getIdea(user.id, result.ideaId) : undefined,
      decision: result.decisionId
        ? await getDecision(user.id, result.decisionId)
        : undefined,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    const response = directionFailure(error);
    if (
      response.status === 409 &&
      userId &&
      input &&
      typeof input === "object" &&
      "type" in input &&
      "id" in input &&
      typeof input.id === "string"
    ) {
      if (input.type === "SAVE_IDEA" || input.type === "ARCHIVE_IDEA")
        return directionResponse(
          { ...(await response.json()), idea: await getIdea(userId, input.id) },
          { status: 409 },
        );
      if (input.type === "SAVE_DECISION" || input.type === "ARCHIVE_DECISION")
        return directionResponse(
          {
            ...(await response.json()),
            decision: await getDecision(userId, input.id),
          },
          { status: 409 },
        );
    }
    return response;
  }
}
