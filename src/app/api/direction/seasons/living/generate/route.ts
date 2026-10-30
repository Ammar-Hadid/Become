import { revalidatePath } from "next/cache";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import {
  generateLivingArtwork,
  generateLivingReference,
  generateLivingBanner,
} from "@/features/seasons/living/services/living-image-generation.service";
import { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const input = (await directionJson(request)) as {
      year: number;
      quarter: number;
      kind?: string;
    };
    if (input.kind === "banner") await generateLivingBanner(user.id, input);
    else if (input.kind === "reference")
      await generateLivingReference(user.id, input);
    else await generateLivingArtwork(user.id, input);
    revalidatePath(`/direction/seasons/${input.year}/${input.quarter}/living`);
    return directionResponse({
      error: null,
      pack: await getLivingSeasonPack(user.id, input.year, input.quarter),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
