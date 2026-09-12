import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { getDecisions } from "@/features/direction/thinking/queries/thinking.query";
export async function GET(request:Request) {try{const u=await directionUser(request),q=new URL(request.url).searchParams;return directionResponse(await getDecisions(u.id,{q:q.get("q")??undefined,cursor:q.get("cursor")??undefined,archived:q.get("archived")==="true",}));}catch(e){return directionFailure(e);}}
