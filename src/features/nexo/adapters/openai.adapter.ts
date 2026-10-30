import "server-only";
import OpenAI from "openai";
import {
  NexoError,
  type NexoProviderRequest,
  type NexoProviderResult,
} from "@/features/nexo/types/nexo.types";

function openAiSchema(schema: Record<string, unknown>) {
  const copy = structuredClone(schema);
  function visit(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const node = value as Record<string, unknown>;
    // OpenAI's format subset excludes uri. The original Zod schema still
    // validates URLs after generation, including source-grounding checks.
    if (node.format === "uri") delete node.format;
    for (const key of ["properties", "$defs", "definitions"]) {
      const children = node[key];
      if (children && typeof children === "object")
        Object.values(children).forEach(visit);
    }
    for (const key of ["items", "additionalProperties", "not"])
      visit(node[key]);
    for (const key of ["anyOf", "allOf", "oneOf", "prefixItems"])
      if (Array.isArray(node[key])) node[key].forEach(visit);
  }
  visit(copy);
  return copy;
}

export async function executeOpenAiTask(
  request: NexoProviderRequest,
): Promise<NexoProviderResult> {
  const client = new OpenAI({
    apiKey: request.apiKey,
    timeout: request.profile.timeoutSeconds * 1000,
    maxRetries: 0,
  });
  const params: Omit<
    OpenAI.Responses.ResponseCreateParamsNonStreaming,
    "stream"
  > = {
    model: request.profile.model,
    instructions: request.instructions,
    input: [{ role: "user", content: request.input }],
    store: false,
    max_output_tokens: request.profile.maxOutputTokens,
    ...(request.webResearch
      ? {
          tools: [
            {
              type: "web_search" as const,
              search_context_size: "medium" as const,
            },
          ],
          tool_choice: "required" as const,
          max_tool_calls: 8,
          include: ["web_search_call.action.sources" as const],
        }
      : {}),
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
        schema: openAiSchema(request.schema),
      },
    },
  };
  const options = { headers: { "Idempotency-Key": request.operationKey } };
  let response: OpenAI.Responses.Response & { _request_id?: string | null };
  if (request.onTextSnapshot) {
    const stream = client.responses.stream(params, {
      ...options,
      signal: AbortSignal.timeout(request.profile.timeoutSeconds * 1000),
    });
    let snapshot = "";
    try {
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          snapshot += event.delta;
          await request.onTextSnapshot(snapshot);
        }
      }
      response = await stream.finalResponse();
    } finally {
      stream.abort();
    }
  } else response = await client.responses.create(params, options);
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
    ...(request.webResearch
      ? {
          searchCalls: response.output.filter(
            (item) => item.type === "web_search_call",
          ).length,
          sources: response.output.flatMap((item) => {
            if (item.type === "message")
              return item.content.flatMap((part) =>
                part.type === "output_text"
                  ? part.annotations
                      .filter((a) => a.type === "url_citation")
                      .map((a) => ({ url: a.url, title: a.title }))
                  : [],
              );
            if (item.type !== "web_search_call" || item.status !== "completed")
              return [];
            if (item.action.type !== "search")
              return item.action.url
                ? [{ url: item.action.url, title: item.action.url }]
                : [];
            return (item.action.sources ?? [])
              .filter((source) => source.type === "url")
              .map((source) => ({ url: source.url, title: source.url }));
          }),
        }
      : {}),
    usage: {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      reasoningTokens:
        response.usage?.output_tokens_details?.reasoning_tokens ?? null,
    },
    providerRequestId: response._request_id ?? null,
  };
}
