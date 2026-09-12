import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { getContentDesk } from "@/features/content/queries/content.query";
export async function GET(request:Request) {try{const u=await directionUser(request),q=new URL(request.url).searchParams;return directionResponse(await getContentDesk(u.id,{q:q.get("q")??undefined,cursor:q.get("cursor")??undefined,archived:q.get("archived")==="true"}));}catch(e){return directionFailure(e);}}
