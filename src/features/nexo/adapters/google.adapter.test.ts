import { afterEach, describe, expect, it, vi } from "vitest";
import { executeGoogleTask } from "./google.adapter";
import type { NexoProviderRequest } from "../types/nexo.types";
vi.mock("server-only", () => ({}));
const request: NexoProviderRequest = {
  profile: {
    id: "test-google",
    name: "Google test",
    provider: "google",
    model: "gemini-3.8-flash",
    reasoning: "medium",
    verbosity: "default",
    maxOutputTokens: 8192,
    timeoutSeconds: 90,
  },
  apiKey: "private-test-api-key",
  instructions: "Return a validated character ID.",
  input: "public catalogue fixture",
  schema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  operationKey: "google-test",
};
describe("Google generation API contract", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses Google's JSON-format enum and parses grounded output with usage", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (
        body.generationConfig.responseFormat.text.mimeType !==
        "APPLICATION_JSON"
      )
        return new Response(
          JSON.stringify({ error: { message: "Invalid enum value" } }),
          { status: 400 },
        );
      expect(body.generationConfig.responseFormat.text.schema).toEqual(
        request.schema,
      );
      expect(init.headers).toMatchObject({ "x-goog-api-key": request.apiKey });
      expect(_url).not.toContain(request.apiKey);
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: '{"id":"anilist:268676"}' }] } },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 20,
            thoughtsTokenCount: 40,
          },
          responseId: "google-response",
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await executeGoogleTask(request)).toMatchObject({
      output: { id: "anilist:268676" },
      usage: { inputTokens: 100, outputTokens: 20, reasoningTokens: 40 },
      providerRequestId: "google-response",
    });
  });
  it("provides the provider failure reason without disclosing the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: `Invalid key ${request.apiKey}` },
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(executeGoogleTask(request)).rejects.toThrow(
      "Invalid key [redacted]",
    );
  });
});
