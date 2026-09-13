import { describe, expect, it } from "vitest";
import { isTrustedRequestOrigin } from "./request-origin.util";

describe("mutation origins behind a reverse proxy", () => {
  const publicOrigin = "https://become.example.com";
  it("accepts the configured HTTPS origin even when the internal URL is loopback", () => {
    expect(
      isTrustedRequestOrigin(
        new Request("http://127.0.0.1:3010/api", {
          headers: { origin: publicOrigin },
        }),
        publicOrigin,
      ),
    ).toBe(true);
  });
  it.each([
    null,
    "null",
    "https://attacker.example.com",
    "http://become.example.com",
    "https://become.example.com:444",
    "broken",
  ])("rejects missing, malformed or cross-origin requests: %s", (origin) => {
    expect(
      isTrustedRequestOrigin(
        new Request(publicOrigin, { headers: origin ? { origin } : {} }),
        publicOrigin,
      ),
    ).toBe(false);
  });
});
