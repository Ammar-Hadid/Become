import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import {
  approveLivingArtwork,
  approveLivingCharacterProfile,
  approveLivingReference,
  activateLivingSeasonPack,
  saveLivingCharacterProfile,
  saveLivingReferencePrompt,
  saveLivingSeasonSetup,
  updateLivingArtworkFocal,
} from "@/features/seasons/living/services/living-season-pack.service";
import { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import {
  approveLivingBanner,
  saveLivingBannerCopy,
  saveLivingBannerCrop,
} from "@/features/seasons/living/services/living-character-banner.service";
import {
  approveLivingVisualIntent,
  draftLivingVisualIntent,
  saveLivingVisualIntent,
} from "@/features/seasons/living/image-direction/services/visual-intent.service";

import { reviewLivingSourceImage } from "@/features/seasons/living/services/living-source-image.service";
import { draftLivingCharacterProfile } from "@/features/seasons/living/services/living-profile-draft.service";
export const runtime = "nodejs";

const seasonQuery = z.object({
  year: z.coerce.number().int().min(2020).max(2200),
  quarter: z.coerce.number().int().min(1).max(4),
});

const command = z
  .object({
    action: z.enum([
      "setup",
      "approve-source-image",
      "retire-source-image",
      "draft-profile",
      "save-profile",
      "save-reference-prompt",
      "approve-profile",
      "approve-reference",
      "approve-artwork",
      "update-focal",
      "save-banner-copy",
      "save-banner-crop",
      "approve-banner",
      "save-visual-intent",
      "approve-visual-intent",
      "draft-visual-intent",
      "activate",
    ]),
    year: z.number().int(),
    quarter: z.number().int(),
  })
  .passthrough();

export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    const { searchParams } = new URL(request.url);
    const { year, quarter } = seasonQuery.parse({
      year: searchParams.get("year"),
      quarter: searchParams.get("quarter"),
    });
    const pack = await getLivingSeasonPack(user.id, year, quarter);
    if (!pack)
      return directionResponse({ error: "Season not found." }, { status: 404 });
    return directionResponse({ error: null, pack });
  } catch (error) {
    return directionFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const data = command.parse(await directionJson(request));
    switch (data.action) {
      case "approve-source-image":
        await reviewLivingSourceImage(user.id, data);
        break;
      case "retire-source-image":
        await reviewLivingSourceImage(user.id, data, true);
        break;
      case "draft-profile":
        await draftLivingCharacterProfile(user.id, data);
        break;
      case "setup":
        await saveLivingSeasonSetup(user.id, data);
        break;
      case "save-profile":
        await saveLivingCharacterProfile(user.id, data);
        break;
      case "save-reference-prompt":
        await saveLivingReferencePrompt(user.id, data);
        break;
      case "approve-profile":
        await approveLivingCharacterProfile(user.id, data);
        break;
      case "save-visual-intent":
        await saveLivingVisualIntent(user.id, data);
        break;
      case "approve-visual-intent":
        await approveLivingVisualIntent(user.id, data);
        break;
      case "draft-visual-intent":
        await draftLivingVisualIntent(user.id, data);
        break;
      case "save-banner-copy":
        await saveLivingBannerCopy(user.id, data);
        break;
      case "save-banner-crop":
        await saveLivingBannerCrop(user.id, data);
        break;
      case "approve-banner":
        await approveLivingBanner(user.id, data);
        break;
      case "approve-reference":
        await approveLivingReference(user.id, data);
        break;
      case "approve-artwork":
        await approveLivingArtwork(user.id, data);
        break;
      case "update-focal":
        await updateLivingArtworkFocal(user.id, data);
        break;
      case "activate":
        await activateLivingSeasonPack(user.id, data);
        break;
    }
    revalidatePath("/");
    revalidatePath(`/direction/seasons/${data.year}/${data.quarter}/living`);
    return directionResponse({
      error: null,
      pack: await getLivingSeasonPack(user.id, data.year, data.quarter),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
