import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { lockDirection } from "@/features/direction/services/direction-mutation.service";
import type { CotsSourceStatus } from "@/features/seasons/discovery/types/cots-discovery.types";
export class CotsProviderError extends Error {
  constructor(
    public status: CotsSourceStatus,
    message: string,
  ) {
    super(message);
  }
}
export async function reserveProviderRequest(
  provider: string,
  limit: number,
  windowMs: number,
) {
  if (limit <= 0)
    throw new CotsProviderError(
      "SETUP_REQUIRED",
      "This source needs an approved request budget before activation.",
    );
  const key = `provider:${provider}`;
  await prisma.$transaction(async (tx) => {
    await lockDirection(tx, "cots", key);
    const now = new Date();
    const row = await tx.cotsProviderCounter.findUnique({ where: { key } });
    if (row?.cooldownUntil && row.cooldownUntil > now)
      throw new CotsProviderError(
        "THROTTLED",
        "This source is cooling down. Other enabled sources remain available.",
      );
    if (row && row.resetAt > now && row.count >= limit)
      throw new CotsProviderError(
        "THROTTLED",
        "This source reached its configured request allowance.",
      );
    await tx.cotsProviderCounter.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
      update:
        row && row.resetAt > now
          ? { count: { increment: 1 } }
          : {
              count: 1,
              resetAt: new Date(now.getTime() + windowMs),
              cooldownUntil: null,
            },
    });
  });
}
export async function providerJson(
  provider: string,
  url: URL,
  options: {
    headers?: Record<string, string>;
    limit?: number;
    windowMs?: number;
    redirects?: "same-origin" | "same-origin-preserve-query";
  } = {},
): Promise<unknown> {
  await reserveProviderRequest(
    provider,
    options.limit ?? 40,
    options.windowMs ?? 60_000,
  );
  if (provider === "serpapi")
    await reserveProviderRequest("serpapi:hour", 50, 3_600_000);
  if (provider === "clipcafe")
    await reserveProviderRequest("clipcafe:minute", 8, 60_000);
  if (provider === "animechan")
    await reserveProviderRequest("animechan:day", 90, 86_400_000);
  try {
    const signal = AbortSignal.timeout(10_000);
    let requestUrl = url;
    let response: Response | null = null;
    for (let redirects = 0; redirects <= 2; redirects++) {
      response = await fetch(requestUrl, {
        cache: "no-store",
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": "Become/1.0 (personal COTS discovery)",
          ...options.headers,
        },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!options.redirects || !location || redirects === 2)
        throw new CotsProviderError(
          "UNAVAILABLE",
          "This source returned an unusable redirect.",
        );
      const nextUrl = new URL(location, requestUrl);
      if (
        nextUrl.origin !== requestUrl.origin ||
        nextUrl.username ||
        nextUrl.password
      )
        throw new CotsProviderError(
          "UNAVAILABLE",
          "This source redirected outside its trusted origin.",
        );
      if (options.redirects === "same-origin-preserve-query" && !nextUrl.search)
        nextUrl.search = requestUrl.search;
      requestUrl = nextUrl;
    }
    if (!response)
      throw new CotsProviderError(
        "UNAVAILABLE",
        "This source did not return a response.",
      );
    if (response.status === 429) {
      const raw = response.headers.get("retry-after") ?? "";
      const seconds = /^\d+$/.test(raw)
        ? Number(raw)
        : Math.max(60, (Date.parse(raw) - Date.now()) / 1000 || 60);
      await prisma.cotsProviderCounter.update({
        where: { key: `provider:${provider}` },
        data: {
          cooldownUntil: new Date(
            Date.now() + Math.min(86_400, Math.max(60, seconds)) * 1000,
          ),
        },
      });
      throw new CotsProviderError(
        "THROTTLED",
        "This source asked Become to wait before another request.",
      );
    }
    if (response.status === 404)
      throw new CotsProviderError(
        "EXHAUSTED",
        "This source has no matching page.",
      );
    if ([401, 403].includes(response.status))
      throw new CotsProviderError(
        "SETUP_REQUIRED",
        "This source needs valid access credentials or entitlement.",
      );
    if (!response.ok)
      throw new CotsProviderError(
        "UNAVAILABLE",
        "This source is temporarily unavailable.",
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > 2_000_000) {
          await reader.cancel();
          throw new Error("large");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof CotsProviderError) throw error;
    throw new CotsProviderError(
      "UNAVAILABLE",
      "This source could not be read. Try another enabled source.",
    );
  }
}
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const string = (value: unknown) =>
  typeof value === "string" ? value : "";
export const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const integer = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
