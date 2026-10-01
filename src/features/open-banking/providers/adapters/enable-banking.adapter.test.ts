import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("../../config/open-banking.config", () => ({
  getOpenBankingConfig: () => ({
    configured: true,
    appId: "app-id",
    privateKeyPath: "/test/private.key",
  }),
}));
import { EnableBankingProvider } from "./enable-banking.adapter";

const key = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();
const requestFetch = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.resetAllMocks();
  mocks.readFile.mockResolvedValue(key);
});

describe("Enable Banking API boundary", () => {
  it("discovers personal institutions and preserves actual bank consent limits", async () => {
    requestFetch.mockResolvedValue(
      Response.json({
        aspsps: [
          {
            name: "ING",
            country: "NL",
            psu_types: ["personal"],
            maximum_consent_validity: 86400,
            required_psu_headers: ["Psu-Ip-Address"],
          },
          {
            name: "Business only",
            country: "NL",
            psu_types: ["business"],
            maximum_consent_validity: 86400,
          },
        ],
      }),
    );
    expect(
      await new EnableBankingProvider(requestFetch).institutions(["NL"]),
    ).toEqual([
      {
        name: "ING",
        country: "NL",
        logoUrl: null,
        maximumConsentSeconds: 86400,
        requiredPsuHeaders: ["Psu-Ip-Address"],
      },
    ]);
  });
  it("does not forward user-presence headers in background requests", async () => {
    requestFetch.mockResolvedValue(Response.json({ balances: [] }));
    await new EnableBankingProvider(requestFetch).balances("session/account");
    const headers = new Headers(requestFetch.mock.calls[0][1]?.headers);
    expect(headers.has("Psu-Ip-Address")).toBe(false);
    expect(headers.get("Authorization")).toMatch(/^Bearer /);
    expect(requestFetch.mock.calls[0][0]).toBe(
      "https://api.enablebanking.com/accounts/session%2Faccount/balances",
    );
  });
  it("keeps all paging filters, even when a returned page is empty", async () => {
    requestFetch.mockResolvedValue(
      Response.json({ transactions: [], continuation_key: "next" }),
    );
    const result = await new EnableBankingProvider(requestFetch).transactions({
      accountId: "account",
      dateFrom: "2026-01-01",
      dateTo: "2026-10-01",
      longestHistory: true,
      continuationKey: "page-2",
    });
    expect(result).toEqual({ observations: [], continuationKey: "next" });
    const url = new URL(String(requestFetch.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      date_from: "2026-01-01",
      date_to: "2026-10-01",
      continuation_key: "page-2",
      strategy: "longest",
    });
  });
  it.each([
    "https://auth.enablebanking.com/ais/start?sessionid=test",
    "https://tilisy.enablebanking.com/ais/start?sessionid=test",
    "https://tilisy-sandbox.enablebanking.com/ais/start?sessionid=test",
  ])("accepts the provider authorization address %s", async (url) => {
    requestFetch.mockResolvedValue(Response.json({ url }));
    const result = await new EnableBankingProvider(
      requestFetch,
    ).beginAuthorization({
      institution: {
        name: "Mock ASPSP",
        country: "NL",
        logoUrl: null,
        maximumConsentSeconds: 3600,
        requiredPsuHeaders: [],
      },
      state: "state",
      userId: "owner",
      redirectUrl: "http://localhost:3041/api/open-banking/callback",
    });
    expect(result).toEqual({ url });
  });
  it.each([
    "http://auth.enablebanking.com/ais/start",
    "https://auth.enablebanking.com.evil.example/ais/start",
    "https://owner:password@auth.enablebanking.com/ais/start",
    "https://auth.enablebanking.com:8443/ais/start",
  ])("rejects an unsafe authorization address %s", async (url) => {
    requestFetch.mockResolvedValue(Response.json({ url }));
    await expect(
      new EnableBankingProvider(requestFetch).beginAuthorization({
        institution: {
          name: "ING",
          country: "NL",
          logoUrl: null,
          maximumConsentSeconds: 3600,
          requiredPsuHeaders: [],
        },
        state: "state",
        userId: "owner",
        redirectUrl: "https://become.example/api/open-banking/callback",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REDIRECT" });
  });
  it("rejects unexpected authorization redirect hosts", async () => {
    requestFetch.mockResolvedValue(
      Response.json({ url: "https://example.org/phishing" }),
    );
    await expect(
      new EnableBankingProvider(requestFetch).beginAuthorization({
        institution: {
          name: "ING",
          country: "NL",
          logoUrl: null,
          maximumConsentSeconds: 3600,
          requiredPsuHeaders: [],
        },
        state: "state",
        userId: "owner",
        redirectUrl: "https://become.example/api/open-banking/callback",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REDIRECT" });
  });
  it("retains retry-after without exposing provider error messages", async () => {
    const before = Date.now();
    requestFetch.mockResolvedValue(
      Response.json(
        {
          error: "ASPSP_RATE_LIMIT_EXCEEDED",
          message: "private account identifier",
        },
        { status: 429, headers: { "Retry-After": "7200" } },
      ),
    );
    const error = await new EnableBankingProvider(requestFetch)
      .balances("account")
      .catch((value: unknown) => value);
    expect(error).toMatchObject({
      code: "ASPSP_RATE_LIMIT_EXCEEDED",
      status: 429,
    });
    expect(String(error)).not.toContain("private account");
    expect(error).toHaveProperty("retryAt", expect.any(Date));
    if (
      error instanceof Error &&
      "retryAt" in error &&
      error.retryAt instanceof Date
    )
      expect(error.retryAt.getTime()).toBeGreaterThanOrEqual(before + 7200_000);
  });
  it("uses the documented provider quota fallback independently of application cadence", async () => {
    const before = Date.now();
    requestFetch.mockResolvedValue(
      Response.json({ error: "ASPSP_RATE_LIMIT_EXCEEDED" }, { status: 429 }),
    );
    const error = await new EnableBankingProvider(requestFetch)
      .balances("account")
      .catch((value: unknown) => value);
    if (
      !(error instanceof Error) ||
      !("retryAt" in error) ||
      !(error.retryAt instanceof Date)
    )
      throw new Error("Expected provider retry instruction.");
    expect(error.retryAt.getTime()).toBeGreaterThanOrEqual(before + 21600_000);
  });
});
