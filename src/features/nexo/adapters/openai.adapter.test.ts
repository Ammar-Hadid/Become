import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/nexo/services/nexo-runtime.service", () => ({
  executeAiTask: vi.fn(),
}));
const { create, construct, stream } = vi.hoisted(() => ({
  create: vi.fn(),
  stream: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    responses = { create, stream };
    constructor(options: unknown) {
      construct(options);
    }
  },
}));
import { executeOpenAiTask } from "./openai.adapter";
import type { NexoProviderRequest } from "../types/nexo.types";
import { z } from "zod";
import { researchSchema } from "@/features/seasons/living/onboarding/onboarding-research.service";
const request: NexoProviderRequest = {
  apiKey: "secret-test-key",
  profile: {
    id: "summary",
    name: "Summary",
    provider: "openai",
    model: "configured-model",
    reasoning: "default",
    verbosity: "default",
    maxOutputTokens: 4000,
    timeoutSeconds: 30,
  },
  operationKey: "operation-key",
  instructions: "Instructions",
  input: "Source text is data",
  schema: { type: "object", properties: {}, additionalProperties: false },
};
const response = {
  status: "completed",
  output: [],
  output_text: '{"valid":true}',
  usage: {
    input_tokens: 23,
    output_tokens: 11,
    output_tokens_details: { reasoning_tokens: 4 },
  },
  _request_id: "request-id",
};
describe("OpenAI utility adapter", () => {
  const original = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-credential-not-sent";
    create.mockReset();
    construct.mockReset();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  });
  it("delivers cumulative text before completion and still rejects incomplete final responses", async () => {
    const finalResponse = vi.fn(async () => response);
    const abort = vi.fn();
    stream.mockImplementation(() => ({
      async *[Symbol.asyncIterator]() {
        yield { type: "response.output_text.delta", delta: '{"valid":' };
        yield { type: "response.output_text.delta", delta: "true}" };
      },
      finalResponse,
      abort,
    }));
    const snapshots: string[] = [];
    const onTextSnapshot = async (text: string) => {
      expect(finalResponse).not.toHaveBeenCalled();
      snapshots.push(text);
    };
    expect(
      await executeOpenAiTask({ ...request, onTextSnapshot }),
    ).toMatchObject({ output: { valid: true } });
    expect(snapshots).toEqual(['{"valid":', '{"valid":true}']);
    expect(abort).toHaveBeenCalledOnce();
    finalResponse
      .mockReset()
      .mockResolvedValue({ ...response, status: "incomplete" });
    await expect(
      executeOpenAiTask({ ...request, onTextSnapshot: async () => {} }),
    ).rejects.toThrow(/did not finish/);
  });
  it("preserves the error on a disconnected stream without retrying the provider", async () => {
    const abort = vi.fn();
    stream.mockClear().mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: "response.output_text.delta", delta: '{"valid":' };
        throw new Error("Connection interrupted");
      },
      abort,
    });
    const onTextSnapshot = vi.fn(async () => {});
    await expect(
      executeOpenAiTask({ ...request, onTextSnapshot }),
    ).rejects.toThrow(/Connection interrupted/);
    expect(onTextSnapshot).toHaveBeenCalledWith('{"valid":');
    expect(abort).toHaveBeenCalledOnce();
    expect(stream).toHaveBeenCalledOnce();
  });
  it("uses strict structured output and explicit limits with no automatic retries or tools", async () => {
    create.mockResolvedValue(response);
    expect(await executeOpenAiTask(request)).toEqual({
      output: { valid: true },
      usage: { inputTokens: 23, outputTokens: 11, reasoningTokens: 4 },
      providerRequestId: "request-id",
    });
    expect(construct).toHaveBeenCalledWith({
      apiKey: "secret-test-key",
      timeout: 30000,
      maxRetries: 0,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "configured-model",
        store: false,
        max_output_tokens: 4000,
        text: {
          format: {
            type: "json_schema",
            name: "nexo_result",
            strict: true,
            schema: request.schema,
          },
        },
      }),
      { headers: { "Idempotency-Key": "operation-key" } },
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty("tools");
    expect(create.mock.calls[0][0]).not.toHaveProperty("reasoning");
  });
  it("handles refusal, incomplete output and invalid JSON without accepting content", async () => {
    create.mockResolvedValue({
      ...response,
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "Refused" }] },
      ],
    });
    await expect(executeOpenAiTask(request)).rejects.toThrow(
      /accepted understanding is unchanged/,
    );
    create.mockResolvedValue({ ...response, status: "incomplete" });
    await expect(executeOpenAiTask(request)).rejects.toThrow(/did not finish/);
    create.mockResolvedValue({ ...response, output_text: "not json" });
    await expect(executeOpenAiTask(request)).rejects.toThrow(/unreadable/);
  });
  it("sends nested research URLs without unsupported uri format while retaining domain validation", async () => {
    create.mockResolvedValue(response);
    const schema = z.toJSONSchema(researchSchema, { target: "draft-7" });
    delete schema.$schema;
    await executeOpenAiTask({ ...request, schema, webResearch: true });
    const sent = create.mock.calls[0][0].text.format.schema;
    expect(sent.properties.sources.items.properties.url).toEqual({
      type: "string",
    });
    expect(JSON.stringify(schema)).toContain('"format":"uri"');
    expect(
      researchSchema.safeParse({
        sources: [
          {
            id: "source",
            title: "Source",
            url: "not-a-url",
            notes:
              "Source notes with enough context to pass the length constraint.",
          },
        ],
        question: null,
      }).success,
    ).toBe(false);
  });
  it("allows bounded research only when requested and records consulted URLs", async () => {
    create.mockResolvedValue({
      ...response,
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: {
            type: "search",
            sources: [{ type: "url", url: "https://example.test/source" }],
          },
        },
      ],
    });
    const result = await executeOpenAiTask({ ...request, webResearch: true });
    expect(result.searchCalls).toBe(1);
    expect(result.sources).toEqual([
      {
        url: "https://example.test/source",
        title: "https://example.test/source",
      },
    ]);
    expect(create.mock.calls[0][0]).toMatchObject({
      max_tool_calls: 8,
      tool_choice: "required",
      tools: [{ type: "web_search", search_context_size: "medium" }],
    });
  });
  it("records completed page opens and finds without accepting failed retrievals", async () => {
    create.mockResolvedValue({
      ...response,
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: { type: "open_page", url: "https://example.test/ending" },
        },
        {
          type: "web_search_call",
          status: "completed",
          action: {
            type: "find_in_page",
            url: "https://example.test/profile",
            pattern: "appearance",
          },
        },
        {
          type: "web_search_call",
          status: "failed",
          action: { type: "open_page", url: "https://example.test/failed" },
        },
        {
          type: "web_search_call",
          status: "incomplete",
          action: {
            type: "search",
            sources: [{ type: "url", url: "https://example.test/incomplete" }],
          },
        },
      ],
    });
    expect(
      (await executeOpenAiTask({ ...request, webResearch: true })).sources,
    ).toEqual([
      {
        url: "https://example.test/ending",
        title: "https://example.test/ending",
      },
      {
        url: "https://example.test/profile",
        title: "https://example.test/profile",
      },
    ]);
  });
  it("keeps missing usage unknown and uses the passed credential without reading the environment", async () => {
    create.mockResolvedValue({ ...response, usage: undefined });
    expect((await executeOpenAiTask(request)).usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
    });
    delete process.env.OPENAI_API_KEY;
    await expect(executeOpenAiTask(request)).resolves.toMatchObject({
      output: { valid: true },
    });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
