import { describe, expect, it } from "vitest";
import { nexoProviderError } from "./nexo-provider-error.util";
describe("safe provider failures", () => {
  it("identifies an application schema error without asking the owner to change their profile", () => {
    expect(
      nexoProviderError(
        { status: 400, code: "invalid_json_schema", message: "secret request" },
        "openai",
        "gpt-6.1-sol",
      ),
    ).toBe(
      "Become sent an output schema that openai rejected. This needs an application fix; changing your key or model profile will not repair the schema. Your saved Season is preserved.",
    );
  });
  it.each([
    [401, /key was rejected/],
    [403, /cannot access/],
    [404, /exact API model ID/],
    [400, /structured outputs/],
    [429, /billing/],
    [500, /provider availability/],
  ])("maps HTTP %s without exposing provider payloads", (status, expected) => {
    const result = nexoProviderError(
      { status, message: "secret-key request-body" },
      "openai",
      "gpt-6.1-sol",
    );
    expect(result).toMatch(expected);
    expect(result).not.toContain("secret-key");
  });
  it("explains uncertain timeouts without retrying", () => {
    expect(
      nexoProviderError({ name: "APIConnectionTimeoutError" }, "openai", "sol"),
    ).toMatch(/may have billed/);
  });
});
