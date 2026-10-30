import "server-only";
import { executeOpenAiTask } from "@/features/nexo/adapters/openai.adapter";
import { executeCompatibleChatTask } from "@/features/nexo/adapters/compatible-chat.adapter";
import { executeGoogleTask } from "@/features/nexo/adapters/google.adapter";
import type {
  NexoProviderRequest,
  NexoProviderResult,
} from "@/features/nexo/types/nexo.types";

export function executeNexoProvider(request: NexoProviderRequest): Promise<NexoProviderResult> {
  if (request.profile.provider === "zai" || request.profile.provider === "moonshot")
    return executeCompatibleChatTask(request as NexoProviderRequest & { profile: NexoProviderRequest["profile"] & { provider: "zai" | "moonshot" } });
  if (request.profile.provider === "google") return executeGoogleTask(request);
  return executeOpenAiTask(request);
}
