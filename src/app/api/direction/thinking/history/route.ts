import { z } from "zod";
import {
  directionUser,
  directionResponse,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getThinkingHistory } from "@/features/direction/thinking/queries/thinking-history.query";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request),
      q = new URL(request.url).searchParams;
    const kind = z
      .enum(["idea", "ideaOutputs", "decision", "reflections"])
      .parse(q.get("kind"));
    const id = z.string().min(1).max(100).parse(q.get("id"));
    const cursor = z
      .string()
      .max(500)
      .optional()
      .parse(q.get("cursor") ?? undefined);
    return directionResponse(
      await getThinkingHistory(user.id, kind, id, cursor),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
