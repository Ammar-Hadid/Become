import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, expect, it, vi } from "vitest";
import profiles from "./benchmark-profiles.json";
import { runOfficialReferenceTrial } from "./runner";
const folders: string[] = [];
afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  );
});

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "become-official-trial-"));
  folders.push(directory);
  const profile = structuredClone(profiles[0]);
  const images = new Map<string, Buffer>();
  for (const [i, reference] of profile.references.entries()) {
    const bytes = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: i * 50, g: 30, b: 20 },
      },
    })
      .png()
      .toBuffer();
    reference.sha256 = createHash("sha256").update(bytes).digest("hex");
    reference.width = 400;
    reference.height = 400;
    images.set(reference.url, bytes);
  }
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://graphql.anilist.co")
      return Response.json({
        data: {
          Character: {
            id: profile.characterId,
            name: { full: "Levi", native: "リヴァイ" },
            media: {
              nodes: [
                {
                  id: profile.workId,
                  type: "ANIME",
                  format: "TV",
                  title: {
                    english: "Attack on Titan",
                    romaji: "Shingeki no Kyojin",
                  },
                  startDate: { year: 2013 },
                  coverImage: {},
                },
              ],
            },
          },
        },
      });
    const image = images.get(url);
    if (image) return new Response(new Uint8Array(image));
    const page = profile.pages.find((p) => p.url === url);
    return new Response(
      `${page?.contains.join(" ")} ${profile.references.map((r) => `<img src="${r.url}">`).join("")}`,
    );
  });
  return { directory, profile, images, fetcher };
}
it("checks inspected bytes and dimensions, deduplicates content, and makes no network calls on a warm run", async () => {
  const { directory, profile, fetcher } = await setup();
  const cold = await runOfficialReferenceTrial({
    directory,
    fetcher,
    benchmarks: [profile],
  });
  expect(cold.gate).toBe("PASS");
  expect(cold.characters[0].references).toHaveLength(4);
  const calls = fetcher.mock.calls.length;
  const warm = await runOfficialReferenceTrial({
    directory,
    fetcher,
    benchmarks: [profile],
  });
  expect(warm.gate).toBe("PASS");
  expect(warm.requests).toBe(0);
  expect(fetcher).toHaveBeenCalledTimes(calls);
  profile.references[1] = { ...profile.references[0], group: "From the show" };
  const duplicate = await runOfficialReferenceTrial({
    directory,
    fetcher,
    benchmarks: [profile],
  });
  expect(duplicate.characters[0].references).toHaveLength(3);
  expect(duplicate.gate).toBe("INCOMPLETE");
});
it("rejects changed images and wrong adaptation records instead of reusing stale acceptance", async () => {
  const { directory, profile, images, fetcher } = await setup();
  images.set(profile.references[0].url, Buffer.from("changed-not-an-image"));
  const changed = await runOfficialReferenceTrial({
    directory,
    fetcher,
    benchmarks: [profile],
  });
  expect(changed.gate).toBe("INCOMPLETE");
  expect(changed.characters[0].references).toHaveLength(3);
  const wrong = await runOfficialReferenceTrial({
    directory,
    fresh: true,
    benchmarks: [profile],
    fetcher: async () =>
      Response.json({
        data: {
          Character: {
            id: profile.characterId,
            media: { nodes: [{ id: 999999 }] },
          },
        },
      }),
  });
  expect(wrong.characters[0].references).toHaveLength(0);
  expect(wrong.gate).toBe("INCOMPLETE");
});
it("reports an outage, respects cancellation and does not invent fallback references", async () => {
  const { directory, profile } = await setup();
  const down = await runOfficialReferenceTrial({
    directory,
    benchmarks: [profile],
    fetcher: async () => new Response(null, { status: 503 }),
  });
  expect(down.gate).toBe("INCOMPLETE");
  expect(down.characters[0].references).toEqual([]);
  expect(down.characters[0].warnings.join(" ")).toContain(
    "Catalogue verification unavailable",
  );
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn();
  const cancelled = await runOfficialReferenceTrial({
    directory,
    benchmarks: [profile],
    fetcher,
    signal: controller.signal,
  });
  expect(cancelled.gate).toBe("INCOMPLETE");
  expect(fetcher).not.toHaveBeenCalled();
});
