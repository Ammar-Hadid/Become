import { z } from "zod";
import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { getContentHistory } from "@/features/content/history/queries/content-history.query";
export async function GET(request:Request){try{const u=await directionUser(request),q=new URL(request.url).searchParams;const kind=z.enum(["observations","publication","sessions","releases"]).parse(q.get("kind")),id=z.string().min(1).max(100).parse(q.get("id")),cursor=z.string().max(500).optional().parse(q.get("cursor")??undefined);return directionResponse(await getContentHistory(u.id,kind,id,cursor));}catch(e){return directionFailure(e);}}
