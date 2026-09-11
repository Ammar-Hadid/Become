import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  directionUser,
  directionFailure,
  directionResponse,
  boundedBody,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { uploadSeasonMedia } from "@/features/seasons/media/services/season-media.service";
import {
  seasonMediaCommand,
  mediaMetadataSchema,
} from "@/features/seasons/media/schemas/season-media.schema";
import { getCotsCollection } from "@/features/seasons/discovery/queries/cots-collection.query";
import { MAX_UPLOAD_BYTES } from "@/features/seasons/media/services/season-image.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const bytes = await boundedBody(request, MAX_UPLOAD_BYTES + 32_000);
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file"),
      raw = form.get("input");
    if (!(file instanceof File) || typeof raw !== "string")
      throw new DirectionError("Choose an image and its details.");
    const c = seasonMediaCommand
      .omit({ expectedVersion: true })
      .extend({
        expectedSelectionRevision: z.number().int().min(0),
        draft: mediaMetadataSchema,
      })
      .parse(JSON.parse(raw));
    await uploadSeasonMedia(
      user.id,
      { ...c, expectedVersion: 0 },
      Buffer.from(await file.arrayBuffer()),
      c.expectedSelectionRevision,
    );
    revalidatePath("/direction", "layout");
    revalidatePath("/");
    return directionResponse(
      await getCotsCollection(user.id, c.year, c.quarter),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
