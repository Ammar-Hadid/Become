import { DateTime } from "luxon";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import type {
  ChannelPlatform,
  PublicationDraft,
} from "@/features/content/types/content.types";
export function publicationIdentity(
  platform: ChannelPlatform,
  variantId: string,
  draft: PublicationDraft,
) {
  if (!draft.url)
    return {
      url: "",
      key: `manual:${variantId}:${draft.channelId}:${draft.publishedOn}`,
    };
  let url: URL;
  try {
    url = new URL(draft.url);
  } catch {
    throw new DirectionError("Enter a complete release URL.", "url");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new DirectionError(
      "Use an HTTPS release URL without credentials.",
      "url",
    );
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let external: string | undefined;
  if (platform === "YOUTUBE") {
    const path = url.pathname.split("/").filter(Boolean);
    const id =
      host === "youtu.be"
        ? path[0]
        : ["youtube.com", "m.youtube.com"].includes(host)
          ? ["shorts", "live", "embed"].includes(path[0])
            ? path[1]
            : path[0] === "watch"
              ? url.searchParams.get("v")
              : null
          : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id))
      throw new DirectionError(
        "Use the YouTube watch or Shorts URL for this release.",
        "url",
      );
    external = id;
    url = new URL(`https://www.youtube.com/watch?v=${id}`);
  } else if (platform === "TIKTOK") {
    external = ["tiktok.com", "m.tiktok.com"].includes(host)
      ? url.pathname.match(/^\/@[^/]+\/video\/(\d+)\/?$/)?.[1]
      : undefined;
    if (!external)
      throw new DirectionError(
        "Use the full TikTok account/video URL, not a shortened share link.",
        "url",
      );
    url.search = "";
    url.hash = "";
  } else if (platform === "INSTAGRAM") {
    external =
      host === "instagram.com"
        ? url.pathname.match(/^\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)\/?$/)?.[1]
        : undefined;
    if (!external)
      throw new DirectionError("Use the Instagram post or reel URL.", "url");
    url.search = "";
    url.hash = "";
  } else {
    url.hash = "";
    external = url.toString();
  }
  return { url: url.toString(), key: `${platform}:${external}` };
}
export function validatePublicationDate(
  draft: PublicationDraft,
  now = new Date(),
) {
  const today = DateTime.fromJSDate(now)
    .setZone("Europe/Amsterdam")
    .toISODate()!;
  if (draft.publishedOn > today)
    throw new DirectionError(
      "A planned date is not a release. Record it after publication.",
      "publishedOn",
    );
  if (draft.publishedAt) {
    const at = DateTime.fromISO(draft.publishedAt, { setZone: true });
    if (
      at.toMillis() > now.getTime() ||
      at.setZone("Europe/Amsterdam").toISODate() !== draft.publishedOn
    )
      throw new DirectionError(
        "The exact release time must fall on the recorded Amsterdam date and cannot be in the future.",
        "publishedAt",
      );
  }
}
