import { directionUser,directionResponse,directionFailure } from "@/features/direction/services/direction-http.service";
import { getIdea } from "@/features/direction/thinking/queries/thinking.query";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {try{const u=await directionUser(request),{id}=await context.params;const row=await getIdea(u.id,id);return directionResponse(row??{error:"Record not found."},{status:row?200:404});}catch(e){return directionFailure(e);}}
