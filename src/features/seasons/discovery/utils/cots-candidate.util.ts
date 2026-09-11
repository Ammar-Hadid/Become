import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
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
export function sanitizeCotsCandidate(
  value: ProviderCandidate,
): ProviderCandidate | null {
  const sourceUrl = webUrl(value.sourceUrl);
  if (
    !sourceUrl ||
    !value.externalId ||
    value.externalId.length > 4000 ||
    (value.text?.length ?? 0) > 2000
  )
    return null;
  const originalUrl = webUrl(value.originalUrl, true),
    previewUrl = webUrl(value.previewUrl, true);
  if (value.form === "IMAGE" && !originalUrl && value.provider !== "zerochan")
    return null;
  return {
    ...value,
    sourceUrl,
    originalUrl,
    previewUrl,
    title: value.title.slice(0, 500),
    credit: value.credit?.slice(0, 500) ?? null,
    sourceDetail: value.sourceDetail.slice(0, 1500),
    sourceWork: value.sourceWork.slice(0, 300),
    license: value.license?.slice(0, 300) ?? null,
  };
}
