import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import type { MediaStorage } from "@/lib/storage/types/media-storage.types";

const keyPattern =
  /^media\/(?:seasons|content)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.webp$/;
export function mediaDataRoot(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const configured = env.BECOME_DATA_DIR?.trim();
  if (configured && !path.isAbsolute(configured))
    throw new Error("BECOME_DATA_DIR must be absolute.");
  if (env.NODE_ENV === "production" && !configured)
    throw new Error(
      "Production requires BECOME_DATA_DIR outside the deployment directory.",
    );
  const root = path.resolve(configured || path.join(cwd, ".data/become"));
  if (root === path.parse(root).root)
    throw new Error("Use a dedicated Become data directory.");
  if (
    env.NODE_ENV === "production" &&
    (root === cwd || root.startsWith(`${cwd}${path.sep}`))
  )
    throw new Error(
      "Production media must live outside the deployment directory.",
    );
  return root;
}

/** Immutable, exclusive writes. Only internally generated logical keys cross this boundary. */
export function filesystemMediaStorage(root = mediaDataRoot()): MediaStorage {
  async function filePath(key: string, create: boolean) {
    if (!keyPattern.test(key)) throw new Error("Invalid media storage key.");
    if (create) await mkdir(root, { recursive: true, mode: 0o700 });
    // Reject symlink roots/descendants rather than following upload-controlled paths.
    if ((await lstat(root)).isSymbolicLink())
      throw new Error("Media root cannot be a symbolic link.");
    const canonical = await realpath(root);
    let folder = canonical;
    const parts = key.split("/");
    for (const part of parts.slice(0, -1)) {
      folder = path.join(folder, part);
      if (create)
        await mkdir(folder, { mode: 0o700 }).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        });
      const info = await lstat(folder);
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new Error("Invalid media directory.");
    }
    return path.join(folder, parts.at(-1)!);
  }
  return {
    async put(key, bytes) {
      const target = await filePath(key, true);
      const file = await open(
        target,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      try {
        await file.writeFile(bytes);
        await file.sync();
      } catch (error) {
        await file.close();
        await unlink(target);
        throw error;
      }
      await file.close();
    },
    async read(key) {
      const file = await open(
        await filePath(key, false),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        return await file.readFile();
      } finally {
        await file.close();
      }
    },
    async remove(key) {
      try {
        const target = await filePath(key, false);
        await unlink(target);
        await rmdir(path.dirname(target)).catch((error) => {
          if (
            !["ENOTEMPTY", "ENOENT"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          )
            throw error;
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    },
  };
}
