import { directionResponse } from "@/features/direction/services/direction-http.service";
import { z } from "zod";
import { directionUser, directionFailure } from "@/features/direction/services/direction-http.service";
import { getDirectionHistory } from "@/features/direction/queries/direction-history.query";
export async function GET(request: Request) { try { const user = await directionUser(request), params = new URL(request.url).searchParams; const input = z.object({ kind: z.enum(["GOAL", "EXPERIMENT"]), id: z.string().min(1), cursor: z.string().optional() }).parse({ kind: params.get("kind"), id: params.get("id"), cursor: params.get("cursor") ?? undefined }); return directionResponse(await getDirectionHistory(user.id, input.kind, input.id, input.cursor)); } catch (error) { return directionFailure(error); } }
