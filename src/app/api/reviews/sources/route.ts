import {
  directionFailure,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { getReviewEvidence } from "@/features/reviews/evidence/queries/review-evidence.query";

export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    return directionResponse(
      await getReviewEvidence(
        user.id,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
