import { z } from "zod";
import { directionFailure, directionJson, directionResponse, directionUser } from "@/features/direction/services/direction-http.service";
import { aiProviderSchema, getAiCredentialStatus, saveAiCredential } from "@/features/nexo/services/ai-credential.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const data = z.object({ provider: aiProviderSchema, key: z.string() }).parse(await directionJson(request, 2048));
    await saveAiCredential(user.id, data.provider, data.key);
    return directionResponse({ error: null, status: await getAiCredentialStatus(user.id) });
  } catch (error) {
    return directionFailure(error);
  }
}
