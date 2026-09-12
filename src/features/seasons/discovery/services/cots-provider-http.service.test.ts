import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { providerJson } from "./cots-provider-http.service";

vi.mock("@/features/direction/services/direction-mutation.service", () => ({
  lockDirection: vi.fn(),
}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        cotsProviderCounter: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue(null),
        },
      }),
    ),
    cotsProviderCounter: { update: vi.fn() },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("provider JSON redirect boundary", () => {
  it("honors a provider-specific response timeout", async () => {
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    );

    await providerJson("serpapi", new URL("https://serpapi.com/search.json"), {
      timeoutMs: 20_000,
    });

    expect(timeout).toHaveBeenCalledWith(20_000);
  });

  it("follows a bounded same-origin canonical redirect and preserves the query", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { Location: "/Okabe+Rintarou" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ items: [{ tag: "Okabe Rintarou" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      providerJson(
        "zerochan",
        new URL("https://www.zerochan.net/Rintar%C5%8D%20Okabe?json=&p=1"),
        { redirects: "same-origin-preserve-query" },
      ),
    ).resolves.toEqual({ items: [{ tag: "Okabe Rintarou" }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://www.zerochan.net/Okabe+Rintarou?json=&p=1",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ redirect: "manual" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("blocks canonical redirects to a different origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://untrusted.example/results" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      providerJson("zerochan", new URL("https://www.zerochan.net/Okabe"), {
        redirects: "same-origin",
      }),
    ).rejects.toThrow("trusted origin");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("identifies Become to Wikimedia and preserves API throttling errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        error: { code: "ratelimited", info: "Rate limit exceeded" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      providerJson(
        "wikimedia",
        new URL("https://www.wikidata.org/w/api.php?action=wbsearchentities"),
      ),
    ).rejects.toMatchObject({ status: "THROTTLED" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({
        "User-Agent": "Become/1.0 (https://github.com/Ammar-Hadid/Become)",
      }),
    });
  });
});
