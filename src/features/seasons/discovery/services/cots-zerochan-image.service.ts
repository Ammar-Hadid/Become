import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import {
  array,
  providerJson,
  record,
  string,
} from "@/features/seasons/discovery/services/cots-provider-http.service";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";

type ZerochanImageDetail = {
  largeUrl: string;
  originalUrl: string;
  credit: string | null;
  references: string[];
};

const detailCache = new Map<
  string,
  { expires: number; detail: ZerochanImageDetail }
>();

export async function resolveZerochanImage(
  candidate: ProviderCandidate,
): Promise<ZerochanImageDetail> {
  if (candidate.provider !== "zerochan" || !/^\d+$/.test(candidate.externalId))
    throw new DirectionError("This Zerochan image reference is invalid.");
  const username = process.env.COTS_ZEROCHAN_USERNAME;
  if (!username)
    throw new DirectionError(
      "Zerochan needs its identifying account username before loading a larger image.",
    );
  const cached = detailCache.get(candidate.externalId);
  if (cached && cached.expires > Date.now()) return cached.detail;

  const url = new URL(`https://www.zerochan.net/${candidate.externalId}?json`);
  const body = record(
    await providerJson("zerochan", url, {
      headers: { "User-Agent": `Become/1.0 - ${username}` },
      limit: 50,
      redirects: "same-origin-preserve-query",
    }),
  );
  const largeUrl = string(body.large) || string(body.full);
  const originalUrl = string(body.full) || largeUrl;
  if (!largeUrl || !originalUrl)
    throw new DirectionError(
      "Zerochan did not return a larger rendition for this image.",
    );
  const detail = {
    largeUrl,
    originalUrl,
    credit: string(body.artist) || candidate.credit,
    references: array(body.sources).filter(
      (value): value is string => typeof value === "string",
    ),
  };
  if (detailCache.size >= 100)
    detailCache.delete(detailCache.keys().next().value!);
  detailCache.set(candidate.externalId, {
    detail,
    expires: Date.now() + 15 * 60_000,
  });
  return detail;
}
