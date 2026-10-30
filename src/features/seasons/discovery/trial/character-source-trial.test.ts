import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runCharacterSourceTrial } from "./character-source-trial";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "become-source-trial-"));
  directories.push(path);
  return path;
}
const fixtures = [
  {
    characterId: 45627,
    workId: 16498,
    name: "Levi",
    native: "リヴァイ",
    title: "Attack on Titan",
  },
  {
    characterId: 35252,
    workId: 9253,
    name: "Rintarou Okabe",
    native: "岡部倫太郎",
    title: "Steins;Gate",
  },
  {
    characterId: 268676,
    workId: 181444,
    name: "Kaoruko Waguri",
    native: "和栗薫子",
    title: "The Fragrant Flower Blooms With Dignity",
  },
];
function catalogue(body: string) {
  const { variables } = JSON.parse(body);
  const item = fixtures.find(
    (row) => row.characterId === variables.characterId,
  )!;
  return {
    data: {
      Character: {
        id: item.characterId,
        name: { full: item.name, native: item.native },
        media: {
          nodes: [
            {
              id: item.workId,
              title: {
                english: item.title,
                romaji: item.title,
                native: item.title,
              },
              format: "TV",
              startDate: { year: 2013 },
              externalLinks: [
                {
                  site: "Official Site",
                  type: "INFO",
                  url: "https://official.example/show/",
                },
                {
                  site: "Twitter",
                  type: "SOCIAL",
                  url: "https://social.example/",
                },
              ],
            },
          ],
        },
      },
    },
  };
}
function searchResponse() {
  return {
    usage: { credits: 1 },
    request_id: "request-1",
    images: [{ url: "https://unbound.example/unbound.jpg" }],
    results: [
      {
        url: "https://official.example/character/",
        title: "Character page",
        content: "Source context",
        images: [
          {
            url: "https://cdn.official.example/character.jpg",
            description: "Needs actual likeness review",
          },
          {
            url: "https://cdn.official.example/character.jpg",
            description: "Duplicate",
          },
          { url: "http://127.0.0.1/image" },
          { url: "https://127.0.0.1/image" },
          { url: "https://user:password@official.example/image" },
        ],
      },
      {
        url: "https://official.example.attacker.test/fanart",
        images: [{ url: "https://attacker.test/fanart.jpg" }],
      },
    ],
  };
}
it("bounds searches, preserves page provenance, rejects unbound/unsafe results, and reuses receipts without another call", async () => {
  const path = await directory();
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === "https://graphql.anilist.co")
        return Response.json(catalogue(String(init?.body)));
      expect(String(url)).toBe("https://api.tavily.com/search");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        search_depth: "basic",
        auto_parameters: false,
        include_images: true,
        include_domains_mode: "restrict",
        include_domains: ["official.example"],
      });
      return Response.json(searchResponse());
    },
  );
  const cold = await runCharacterSourceTrial({
    apiKey: "test-key",
    directory: path,
    fetcher,
  });
  expect(cold.characters).toHaveLength(3);
  expect(cold.characters.every((item) => item.searches.length === 6)).toBe(
    true,
  );
  expect(
    cold.characters.every(
      (item) =>
        item.images.length === 1 &&
        item.images[0].sourceUrl === "https://official.example/character/",
    ),
  ).toBe(true);
  expect(cold.qualityGate).toBe("AWAITING_VISUAL_REVIEW");
  expect(fetcher).toHaveBeenCalledTimes(21);
  const calls = fetcher.mock.calls.length;
  const warm = await runCharacterSourceTrial({
    apiKey: "test-key",
    directory: path,
    fetcher,
  });
  expect(fetcher).toHaveBeenCalledTimes(calls);
  expect(
    warm.characters.every((item) =>
      item.searches.every((search) => search.cacheHit),
    ),
  ).toBe(true);
  expect(
    await readFile(join(path, "45627-16498", "search-0.json"), "utf8"),
  ).not.toContain("test-key");
});
it("reserves failed requests durably and never automatically spends again on retry", async () => {
  const path = await directory();
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === "https://graphql.anilist.co")
        return Response.json(catalogue(String(init?.body)));
      throw new Error("Network error containing a secret");
    },
  );
  const failed = await runCharacterSourceTrial({
    apiKey: "test-key",
    directory: path,
    fetcher,
  });
  expect(
    failed.characters.every((item) =>
      item.searches.every((search) => search.status === "FAILED"),
    ),
  ).toBe(true);
  expect(JSON.stringify(failed)).not.toContain("containing a secret");
  const calls = fetcher.mock.calls.length;
  await runCharacterSourceTrial({
    apiKey: "test-key",
    directory: path,
    fetcher,
  });
  expect(fetcher).toHaveBeenCalledTimes(calls);
});
it("makes no requests without a key and refuses overlapping runs", async () => {
  const path = await directory();
  const fetcher = vi.fn();
  await expect(
    runCharacterSourceTrial({ apiKey: "", directory: path, fetcher }),
  ).rejects.toThrow("TAVILY_API_KEY");
  expect(fetcher).not.toHaveBeenCalled();
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(path, "running.lock"));
  await expect(
    runCharacterSourceTrial({ apiKey: "test-key", directory: path, fetcher }),
  ).rejects.toThrow("already running");
  expect(fetcher).not.toHaveBeenCalled();
});
