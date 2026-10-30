import "server-only";
import OpenAI from "openai";
import { NexoError, type NexoProviderRequest, type NexoProviderResult } from "@/features/nexo/types/nexo.types";

const baseUrls = {
  zai: "https://api.z.ai/api/paas/v4/",
  moonshot: "https://api.moonshot.ai/v1",
} as const;

export async function executeCompatibleChatTask(
  request: NexoProviderRequest & { profile: NexoProviderRequest["profile"] & { provider: "zai" | "moonshot" } },
): Promise<NexoProviderResult> {
  const client = new OpenAI({ apiKey: request.apiKey, baseURL: baseUrls[request.profile.provider], timeout: request.profile.timeoutSeconds * 1000, maxRetries: 0 });
  const extraBody = request.profile.provider === "zai"
    ? { thinking: { type: request.profile.reasoning === "none" ? "disabled" : "enabled" } }
    : request.profile.reasoning === "default"
      ? {}
      : { reasoning_effort: request.profile.reasoning === "xhigh" ? "max" : request.profile.reasoning === "high" ? "high" : "low" };
  const params = {
    model: request.profile.model,
    messages: [
      { role: "system", content: `${request.instructions}\nReturn one JSON object matching this schema: ${JSON.stringify(request.schema)}` },
      { role: "user", content: request.input },
    ],
    response_format: { type: "json_object" },
    max_tokens: request.profile.maxOutputTokens,
    ...extraBody,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
  const response = await client.chat.completions.create(params);
  const content = response.choices[0]?.message.content;
  if (!content) throw new NexoError("The model returned no usable result.");
  let output: unknown;
  try { output = JSON.parse(content); } catch { throw new NexoError("The model returned invalid JSON."); }
  return {
    output,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? null,
      outputTokens: response.usage?.completion_tokens ?? null,
      reasoningTokens: null,
    },
    providerRequestId: response.id,
  };
}
