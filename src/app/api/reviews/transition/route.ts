import {transitionCommandSchema,type TransitionCommand} from "@/features/reviews/contracts/schemas/review.schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { getSeasonTransition } from "@/features/seasons/transition/queries/season-transition.query";
import { mutateSeasonTransition } from "@/features/seasons/transition/services/season-transition.service";

const querySchema = z
  .object({
    startOn: z.iso.date().optional(),
    clientId: z.uuid().optional(),
    replay: z.enum(["1", "true"]).optional(),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return directionResponse({
      error: null,
      transition: await getSeasonTransition(user.id, {
        ...query,
        replay: query.replay ? true : undefined,
        includeReview: true,
      }),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
export async function POST(request: Request) {
  let userId:string|null=null,command:TransitionCommand|null=null;
  try {
    const user = await directionUser(request, true);
    userId=user.id;command=transitionCommandSchema.parse(await directionJson(request));
    const result = await mutateSeasonTransition(user.id,command);
    revalidatePath("/");
    return directionResponse(result);
  } catch (error) {
    const failure=directionFailure(error);
    if(failure.status===409&&userId&&command){
      const transition=await getSeasonTransition(userId,{startOn:command.startOn,clientId:command.clientId,includeReview:true}).catch(()=>null);
      if(transition)return directionResponse({...await failure.json(),transition},{status:409});
    }
    return failure;
  }
}
