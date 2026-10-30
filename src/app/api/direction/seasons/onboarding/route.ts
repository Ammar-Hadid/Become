import { revalidatePath } from "next/cache";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { onboardingLocatorSchema } from "@/features/seasons/living/onboarding/onboarding.schema";
import {
  commandSeasonOnboarding,
  getSeasonOnboarding,
} from "@/features/seasons/living/onboarding/onboarding.service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    const params = new URL(request.url).searchParams;
    const { year, quarter } = onboardingLocatorSchema.parse({
      year: Number(params.get("year")),
      quarter: Number(params.get("quarter")),
    });
    return directionResponse(await getSeasonOnboarding(user.id, year, quarter));
  } catch (error) {
    return directionFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const view = await commandSeasonOnboarding(
      user.id,
      await directionJson(request, 16000),
    );
    revalidatePath("/direction");
    revalidatePath("/");
    return directionResponse(view);
  } catch (error) {
    return directionFailure(error);
  }
}
