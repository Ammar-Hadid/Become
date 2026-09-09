import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  filesystemMediaStorage,
  mediaDataRoot,
} from "./filesystem-media.adapter";
const roots: string[] = [];
async function root() {
  const value = await mkdtemp(path.join(tmpdir(), "become-storage-test-"));
  roots.push(value);
  return value;
}
afterEach(async () => {
  for (const dir of roots.splice(0))
    await rm(dir, { recursive: true, force: true });
});
describe("private filesystem media", () => {
  it("writes exclusively, reads exact bytes, and deletes only the requested key", async () => {
    const storage = filesystemMediaStorage(await root()),
      key = "media/seasons/season-one/image-one.webp";
    await storage.put(key, Buffer.from("one"));
    await expect(
      storage.put(key, Buffer.from("replacement")),
    ).rejects.toThrow();
    expect((await storage.read(key)).toString()).toBe("one");
    await storage.remove(key);
    await expect(storage.read(key)).rejects.toThrow();
    await storage.remove(key);
  });
  it("rejects traversal and symlink descendants without writing outside the root", async () => {
    const dir = await root(),
      outside = await root(),
      storage = filesystemMediaStorage(dir);
    await expect(
      storage.put("../outside.webp", Buffer.from("bad")),
    ).rejects.toThrow("Invalid");
    await mkdir(path.join(dir, "media"));
    await symlink(outside, path.join(dir, "media/seasons"));
    await expect(
      storage.put("media/seasons/a/b.webp", Buffer.from("bad")),
    ).rejects.toThrow("Invalid");
  });
  it("requires deliberate production placement and isolates development storage", () => {
    expect(mediaDataRoot({ NODE_ENV: "development" }, "/repo")).toBe(
      "/repo/.data/become",
    );
    expect(() => mediaDataRoot({ NODE_ENV: "production" }, "/repo")).toThrow();
    expect(() =>
      mediaDataRoot(
        { NODE_ENV: "production", BECOME_DATA_DIR: "/repo/data" },
        "/repo",
      ),
    ).toThrow();
    expect(
      mediaDataRoot(
        { NODE_ENV: "production", BECOME_DATA_DIR: "/srv/data/become" },
        "/repo",
      ),
    ).toBe("/srv/data/become");
  });
});
