import { filesystemMediaStorage } from "@/lib/storage/adapters/filesystem-media.adapter";
import type { MediaStorage } from "@/lib/storage/types/media-storage.types";

/** The application depends on logical keys; provider selection belongs here. */
export function getMediaStorage(): MediaStorage {
  return filesystemMediaStorage();
}
