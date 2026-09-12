import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { hasUnsafeCotsImageMetadata } from "@/features/seasons/discovery/utils/cots-image-safety.util";
import {
  normalizeCotsQuote,
  normalizeCotsText,
} from "@/features/seasons/discovery/utils/cots-text-normalizer.util";

const SERVER_BLOCKED_IMAGE_HOSTS = new Set(["static.wikia.nocookie.net"]);

function webUrl(
  value: string | undefined,
  httpsOnly = false,
): string | undefined {
  if (!value || value.length > 4000) return undefined;
  try {
    const url = new URL(value);
    return (httpsOnly
      ? url.protocol === "https:"
      : ["http:", "https:"].includes(url.protocol)) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function downloadableImageUrl(value: string | undefined) {
  const href = webUrl(value, true);
  if (!href) return undefined;
  return SERVER_BLOCKED_IMAGE_HOSTS.has(new URL(href).hostname.toLowerCase())
    ? undefined
    : href;
}

export function sanitizeCotsCandidate(
  value: ProviderCandidate,
): ProviderCandidate | null {
  if (
    value.form === "IMAGE" &&
    hasUnsafeCotsImageMetadata(
      value.title,
      value.sourceDetail,
      value.sourceUrl,
      value.originalUrl,
      value.previewUrl,
    )
  )
    return null;
  const quote =
    value.text && ["QUOTATION", "DIALOGUE_TURN"].includes(value.form)
      ? normalizeCotsQuote(value.text)
      : null;
  const text = value.text
    ? (quote?.text ??
      (["QUOTATION", "DIALOGUE_TURN"].includes(value.form)
        ? ""
        : normalizeCotsText(value.text)))
    : value.text;
  const sourceUrl = webUrl(value.sourceUrl);
  if (
    !sourceUrl ||
    !value.externalId ||
    value.externalId.length > 4000 ||
    (text?.length ?? 0) > 2000 ||
    (value.form !== "IMAGE" && value.form !== "SOURCE_LINK" && !text?.trim())
  )
    return null;
  // Fandom's CDN serves previews to browsers but challenges server-side imports.
  // Do not offer a result that Become already knows it cannot save.
  const originalUrl = downloadableImageUrl(value.originalUrl),
    previewUrl = webUrl(value.previewUrl, true);
  if (value.form === "IMAGE" && !originalUrl && value.provider !== "zerochan")
    return null;
  return {
    ...value,
    text,
    sourceUrl,
    originalUrl,
    previewUrl,
    title: value.title.slice(0, 500),
    credit: value.credit?.slice(0, 500) ?? null,
    sourceDetail: [value.sourceDetail, quote?.sourceContext]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 1500),
    sourceWork: value.sourceWork.slice(0, 300),
    license: value.license?.slice(0, 300) ?? null,
  };
}
