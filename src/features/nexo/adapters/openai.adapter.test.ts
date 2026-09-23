import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { create, construct } = vi.hoisted(() => ({
  create: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    responses = { create };
    constructor(options: unknown) {
      construct(options);
    }
  },
}));
import { executeOpenAiTask } from "./openai.adapter";
import type { NexoProviderRequest } from "../types/nexo.types";
const request: NexoProviderRequest = {
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
  usage: { input_tokens: 23, output_tokens: 11 },
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
  it("uses strict structured output and explicit limits with no automatic retries or tools", async () => {
    create.mockResolvedValue(response);
    expect(await executeOpenAiTask(request)).toEqual({
      output: { valid: true },
      usage: { inputTokens: 23, outputTokens: 11 },
      providerRequestId: "request-id",
    });
    expect(construct).toHaveBeenCalledWith({
      apiKey: "test-credential-not-sent",
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
  it("keeps missing usage unknown and requires a server credential", async () => {
    create.mockResolvedValue({ ...response, usage: undefined });
    expect((await executeOpenAiTask(request)).usage).toEqual({
      inputTokens: null,
      outputTokens: null,
    });
    delete process.env.OPENAI_API_KEY;
    await expect(executeOpenAiTask(request)).rejects.toThrow(/credential/);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
