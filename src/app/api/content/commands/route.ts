import { DuplicatePublicationError } from "@/features/content/publications/types/publication-error.types";
import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionJson,
  directionResponse,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { executeContentCommand } from "@/features/content/services/content-mutation.service";
import {
  getContentWorkspace,
  getContentChannels,
} from "@/features/content/queries/content.query";
export async function POST(request: Request) {
  let userId: string | undefined, input: unknown;
  try {
    const user = await directionUser(request, true);
    userId = user.id;
    input = await directionJson(request, 1_000_000);
    const result = await executeContentCommand(user.id, input);
    const workspace = result.contentId
      ? await getContentWorkspace(user.id, result.contentId, {
          variantId: result.variantId,
          publicationIds: result.publicationIds,
        })
      : undefined;
    revalidatePath("/content", "layout");
    revalidatePath("/direction", "layout");
    revalidatePath("/");
    return directionResponse({
      error: null,
      ...result,
      workspace,
      channels: !result.contentId
        ? await getContentChannels(user.id)
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
      "contentId" in input &&
      typeof input.contentId === "string"
    ) {
      const workspace = await getContentWorkspace(userId, input.contentId, {
        variantId:
          "variantId" in input && typeof input.variantId === "string"
            ? input.variantId
            : undefined,
      });
      return directionResponse(
        {
          ...(await response.json()),
          workspace,
          ...(error instanceof DuplicatePublicationError
            ? { existingRelease: error.existingRelease }
            : {}),
        },
        { status: 409 },
      );
    }
    return response;
  }
}
