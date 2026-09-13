import { z } from "zod";
import {
  directionFailure,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { reviewIdentitySchema } from "@/features/reviews/contracts/schemas/review.schema";
import { getReviewView } from "@/features/reviews/persistence/queries/review.query";

const requestSchema = reviewIdentitySchema
  .extend({ editionId: z.string().min(1).max(200).optional() })
  .strict();
export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    const { editionId, ...identity } = requestSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return directionResponse({
      error: null,
      view: await getReviewView(user.id, identity, editionId),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
