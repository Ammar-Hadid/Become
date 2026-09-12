import { z } from "zod";
import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { dayInput } from "@/features/direction/schemas/direction.schema";
import { getContentAnalytics } from "@/features/content/analytics/queries/content-analytics.query";
export async function GET(request:Request) {try{const u=await directionUser(request),q=new URL(request.url).searchParams;const period=z.enum(["week","month","season","year"]).parse(q.get("period")??"season"),date=dayInput.optional().parse(q.get("date")??undefined);return directionResponse(await getContentAnalytics(u.id,period,date));}catch(e){return directionFailure(e);}}
