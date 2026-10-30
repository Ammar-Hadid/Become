import {
  directionUser,
  directionJson,
  directionResponse,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { getSeasonOnboarding } from "@/features/seasons/living/onboarding/onboarding.service";
import {
  promptWritingRequestSchema,
  promptGroupTargets,
} from "@/features/seasons/living/image-direction/schemas/image-prompt-writing.schema";
import { writeSeasonImagePrompts } from "@/features/seasons/living/image-direction/services/image-prompt-writing.service";
import { resolveSeasonImagePackage } from "@/features/seasons/living/image-direction/services/image-prompt-package.service";
import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import {
  sceneTemplateKey,
  type ImagePromptVariant,
} from "@/features/seasons/living/image-direction/utils/image-prompt-package.util";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const data = promptWritingRequestSchema.parse(await directionJson(request));
    const batch = await writeSeasonImagePrompts(user.id, data);
    for (const variant of promptGroupTargets(data.group, data.chapter)) {
      const slot = variant.startsWith("scene-")
        ? livingArtworkSlots.find((slot) => sceneTemplateKey(slot) === variant)
        : undefined;
      await resolveSeasonImagePackage(user.id, data.year, data.quarter, {
        variant: variant as ImagePromptVariant,
        slot,
        batchId: batch.id,
      });
    }
    return directionResponse(
      await getSeasonOnboarding(user.id, data.year, data.quarter),
    );
  } catch (cause) {
    return directionFailure(cause);
  }
}
