import "server-only";
import {
  NexoError,
  type NexoProviderRequest,
  type NexoProviderResult,
} from "@/features/nexo/types/nexo.types";

export async function executeGoogleTask(
  request: NexoProviderRequest,
): Promise<NexoProviderResult> {
  const reasoning = request.profile.reasoning;
  const level =
    reasoning === "high" || reasoning === "xhigh"
      ? "HIGH"
      : reasoning === "low" || reasoning === "minimal" || reasoning === "none"
        ? "LOW"
        : "MEDIUM";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.profile.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": request.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.instructions }] },
        contents: [{ role: "user", parts: [{ text: request.input }] }],
        generationConfig: {
          maxOutputTokens: request.profile.maxOutputTokens,
          thinkingConfig: { thinkingLevel: level },
          responseFormat: {
            text: { mimeType: "APPLICATION_JSON", schema: request.schema },
          },
        },
      }),
      signal: AbortSignal.timeout(request.profile.timeoutSeconds * 1000),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: unknown };
    } | null;
    const detail =
      typeof body?.error?.message === "string"
        ? body.error.message
            .split(request.apiKey)
            .join("[redacted]")
            .replace(/AIza[\w-]{20,}/g, "[redacted]")
            .slice(0, 400)
        : "";
    throw new NexoError(
      `Google generation failed (${response.status}).${detail ? ` ${detail}` : ""}`,
    );
  }
  const result = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
    };
    responseId?: string;
  };
  const content = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  if (!content) throw new NexoError("The model returned no usable result.");
  let output: unknown;
  try {
    output = JSON.parse(content);
  } catch {
    throw new NexoError("The model returned invalid JSON.");
  }
  return {
    output,
    usage: {
      inputTokens: result.usageMetadata?.promptTokenCount ?? null,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? null,
      reasoningTokens: result.usageMetadata?.thoughtsTokenCount ?? null,
    },
    providerRequestId: result.responseId ?? null,
  };
}
