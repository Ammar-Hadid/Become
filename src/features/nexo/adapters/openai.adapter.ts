import "server-only";
import OpenAI from "openai";
import {
  NexoError,
  type NexoProviderRequest,
  type NexoProviderResult,
} from "@/features/nexo/types/nexo.types";

export async function executeOpenAiTask(
  request: NexoProviderRequest,
): Promise<NexoProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey)
    throw new NexoError(
      "Add the server’s OpenAI credential before generating a synthesis.",
    );
  const client = new OpenAI({
    apiKey,
    timeout: request.profile.timeoutSeconds * 1000,
    maxRetries: 0,
  });
  const response = await client.responses.create(
    {
      model: request.profile.model,
      instructions: request.instructions,
      input: [{ role: "user", content: request.input }],
      store: false,
      max_output_tokens: request.profile.maxOutputTokens,
      ...(request.profile.reasoning !== "default"
        ? { reasoning: { effort: request.profile.reasoning } }
        : {}),
      text: {
        ...(request.profile.verbosity !== "default"
          ? { verbosity: request.profile.verbosity }
          : {}),
        format: {
          type: "json_schema",
          name: "nexo_result",
          strict: true,
          schema: request.schema,
        },
      },
    },
    { headers: { "Idempotency-Key": request.operationKey } },
  );
  if (
    response.output.some(
      (item) =>
        item.type === "message" &&
        item.content.some((part) => part.type === "refusal"),
    )
  )
    throw new NexoError(
      "Nexo could not generate this synthesis. Your accepted understanding is unchanged.",
    );
  if (response.status !== "completed" || !response.output_text)
    throw new NexoError(
      "Generation did not finish. Try again or adjust the model’s output limit in Nexo settings.",
    );
  let output: unknown;
  try {
    output = JSON.parse(response.output_text);
  } catch {
    throw new NexoError(
      "The model returned an unreadable proposal. Try generating again.",
    );
  }
  return {
    output,
    usage: {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
    providerRequestId: response._request_id ?? null,
  };
}
