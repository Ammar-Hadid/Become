import { reviewCommandSchema,type ReviewCommand } from "@/features/reviews/contracts/schemas/review.schema";
import {getReviewView} from "@/features/reviews/persistence/queries/review.query";
import { revalidatePath } from "next/cache";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { mutateReview } from "@/features/reviews/persistence/services/review.service";

export async function POST(request: Request) {
  let userId:string|null=null,command:ReviewCommand|null=null;
  try {
    const user = await directionUser(request, true);
    userId=user.id;command=reviewCommandSchema.parse(await directionJson(request));
    const result = await mutateReview(user.id, command);
    revalidatePath("/reviews", "layout");
    revalidatePath("/direction", "layout");
    revalidatePath("/");
    return directionResponse(result);
  } catch (error) {
    const failure=directionFailure(error);
    if(failure.status===409&&userId&&command){
      const view=await getReviewView(userId,{timeframe:command.timeframe,startOn:command.startOn}).catch(()=>null);
      if(view)return directionResponse({...await failure.json(),view},{status:409});
    }
    return failure;
  }
}
