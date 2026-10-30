import { revalidatePath } from "next/cache";
import {
  boundedBody,
  directionFailure,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { MAX_UPLOAD_BYTES } from "@/features/seasons/media/services/season-image.service";
import {
  uploadLivingArtwork,
  uploadLivingReference,
} from "@/features/seasons/living/services/living-season-pack.service";
import { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import { uploadLivingBannerImage } from "@/features/seasons/living/services/living-character-banner.service";

import { uploadLivingSourceImage } from "@/features/seasons/living/services/living-source-image.service";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const bytes = await boundedBody(request, MAX_UPLOAD_BYTES + 32_000);
    const form = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    const raw = form.get("input");
    if (!(file instanceof File) || typeof raw !== "string")
      throw new DirectionError("Choose an artwork file and slot.");
    const input = JSON.parse(raw) as {
      year: number;
      quarter: number;
      kind?: string;
    };
    const image = Buffer.from(await file.arrayBuffer());
    if (input.kind === "source-image")
      await uploadLivingSourceImage(user.id, input, image);
    else if (input.kind === "banner")
      await uploadLivingBannerImage(user.id, input, image);
    else if (input.kind === "reference")
      await uploadLivingReference(user.id, input, image);
    else await uploadLivingArtwork(user.id, input, image);
    revalidatePath("/");
    return directionResponse({
      error: null,
      pack: await getLivingSeasonPack(user.id, input.year, input.quarter),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
