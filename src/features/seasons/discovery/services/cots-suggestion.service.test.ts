import { afterEach, describe, expect, it, vi } from "vitest";
import { CotsProviderError, providerJson } from "./cots-provider-http.service";
import { suggestCotsIdentity } from "./cots-suggestion.service";

vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: {} }));
vi.mock("./cots-provider-http.service", async (original) => ({
  ...(await original<typeof import("./cots-provider-http.service")>()),
  providerJson: vi.fn(),
}));

const input = {
  displayName: "Cache Test Hero",
  sourceWork: "First Work",
  sourceCategory: "anime",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("character identity suggestions", () => {
  it("reuses one external name lookup while ranking each source work locally", async () => {
    vi.mocked(providerJson)
      .mockResolvedValueOnce({
        search: [
          {
            id: "Q1001",
            label: "Cache Test Hero",
            description: "character from First Work",
          },
          {
            id: "Q1002",
            label: "Cache Test Hero",
            description: "character from Second Work",
          },
        ],
      })
      .mockResolvedValueOnce({
        entities: {
          Q1001: { claims: {} },
          Q1002: { claims: {} },
        },
      });

    const first = await suggestCotsIdentity(input);
    const second = await suggestCotsIdentity({
      ...input,
      displayName: "  cache test hero  ",
      sourceWork: "Second Work",
    });

    expect(first.items.map(({ id }) => id)).toEqual(["Q1001", "Q1002"]);
    expect(second.items.map(({ id }) => id)).toEqual(["Q1002", "Q1001"]);
    expect(providerJson).toHaveBeenCalledTimes(2);
  });

  it("coalesces simultaneous requests for the same normalized name", async () => {
    let releaseSearch!: (value: unknown) => void;
    vi.mocked(providerJson)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseSearch = resolve;
          }),
      )
      .mockResolvedValueOnce({
        entities: { Q2001: { claims: {} } },
      });

    const first = suggestCotsIdentity({
      ...input,
      displayName: "Concurrent Test Hero",
    });
    const second = suggestCotsIdentity({
      ...input,
      displayName: "concurrent test hero",
    });
    releaseSearch({
      search: [
        {
          id: "Q2001",
          label: "Concurrent Test Hero",
          description: "fictional character",
        },
      ],
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(providerJson).toHaveBeenCalledTimes(2);
  });

  it("does not cache a throttled lookup as an exhausted name", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(providerJson)
      .mockRejectedValueOnce(
        new CotsProviderError("THROTTLED", "Take a short pause."),
      )
      .mockResolvedValueOnce({
        search: [
          {
            id: "Q3001",
            label: "Retry Test Hero",
            description: "fictional character",
          },
        ],
      })
      .mockResolvedValueOnce({ entities: { Q3001: { claims: {} } } });

    await expect(
      suggestCotsIdentity({ ...input, displayName: "Retry Test Hero" }),
    ).resolves.toMatchObject({ status: "THROTTLED", items: [] });
    await expect(
      suggestCotsIdentity({ ...input, displayName: "Retry Test Hero" }),
    ).resolves.toMatchObject({ status: "AVAILABLE" });
    expect(providerJson).toHaveBeenCalledTimes(3);
    expect(warning).toHaveBeenCalledWith(
      "COTS identity suggestion source failed",
      expect.objectContaining({
        provider: "wikidata",
        status: "THROTTLED",
        detail: "Take a short pause.",
        sourceCategory: "anime",
      }),
    );
  });
});
