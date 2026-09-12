import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { getThinkingOptions } from "@/features/direction/thinking/queries/thinking.query";
export async function GET(request:Request) {try{const u=await directionUser(request);return directionResponse(await getThinkingOptions(u.id));}catch(e){return directionFailure(e);}}
