import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import {
  getCotsCollection,
  candidateView,
} from "@/features/seasons/discovery/queries/cots-collection.query";
import { cotsDiscoverCommand } from "@/features/seasons/discovery/schemas/cots-discovery.schema";
import {
  fetchCotsProvider,
  cotsProviderRoute,
} from "@/features/seasons/discovery/adapters/cots-provider.adapter";
import { CotsProviderError } from "@/features/seasons/discovery/services/cots-provider-http.service";
import type { CotsCandidatePage } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { getServerEnv } from "@/lib/config/environment.config";
import { sanitizeCotsCandidate } from "@/features/seasons/discovery/utils/cots-candidate.util";
import { maintainCotsDiscovery } from "./cots-maintenance.service";

function sign(value: string) {
  return createHmac("sha256", getServerEnv().BETTER_AUTH_SECRET)
    .update(value)
    .digest("base64url");
}
function encode(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decode(value: string) {
  const [payload, signature] = value.split(".");
  if (
    !payload ||
    !signature ||
    signature.length !== sign(payload).length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload)))
  )
    throw new DirectionError(
      "This discovery page expired. Start this search again.",
    );
  return JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    key: string;
    provider: number;
    cursor: string | null;
    expires: number;
  };
}
const cache = new Map<string, { expires: number; page: CotsCandidatePage }>();
export async function discoverCots(
  userId: string,
  input: unknown,
): Promise<CotsCandidatePage> {
  const c = cotsDiscoverCommand.parse(input),
    collection = await getCotsCollection(userId, c.year, c.quarter),
    identity = collection.identity;
  if (!identity?.sourceCategory || !identity.discoveryContextId)
    throw new DirectionError(
      "Choose and confirm the source of your inspiration first.",
    );
  if (
    identity.identityRevision !== c.identityRevision ||
    identity.discoveryRevision !== c.discoveryRevision
  )
    throw new DirectionError(
      "The discovery context changed. Search again with the saved identity.",
      undefined,
      409,
    );
  const queryKey = createHash("sha256")
    .update(
      JSON.stringify([
        userId,
        identity.id,
        identity.identityRevision,
        identity.discoveryContextId,
        c.kind,
      ]),
    )
    .digest("hex");
  const route = cotsProviderRoute({ identity, kind: c.kind, cursor: null });
  const state = c.cursor
    ? decode(c.cursor)
    : {
        key: queryKey,
        provider: 0,
        cursor: null,
        expires: Date.now() + 3_600_000,
      };
  if (
    state.key !== queryKey ||
    state.expires < Date.now() ||
    !Number.isInteger(state.provider) ||
    state.provider < 0 ||
    state.provider >= route.length
  )
    throw new DirectionError(
      "This discovery page belongs to an earlier search. Start again.",
      undefined,
      409,
    );
  const cacheKey = `${queryKey}:${c.cursor ?? "first"}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.page;
  await maintainCotsDiscovery(userId);
  const result: CotsCandidatePage = {
    identityRevision: identity.identityRevision,
    discoveryRevision: identity.discoveryRevision,
    queryKey,
    items: [],
    nextCursor: null,
    exhausted: false,
    sources: [],
  };
  const season = await prisma.userSeason.findUniqueOrThrow({
    where: {
      userId_year_quarter: { userId, year: c.year, quarter: c.quarter },
    },
  });
  // Sequential bounded supplementation, never provider fan-out on each keystroke.
  for (let index = state.provider; index < route.length; index++) {
    const provider = route[index];
    try {
      const page = await fetchCotsProvider(provider, {
        identity,
        kind: c.kind,
        cursor: index === state.provider ? state.cursor : null,
      });
      result.sources.push({
        provider,
        status: page.status,
        message: page.message,
      });
      const seen = new Set(
        result.items.map((v) => `${v.sourceUrl}:${v.text ?? ""}`),
      );
      for (const raw of page.items.slice(0, 100)) {
        const item = sanitizeCotsCandidate(raw);
        if (!item) continue;
        const sourceKey = createHash("sha256")
          .update(
            `${item.form}:${item.originalUrl ?? item.sourceUrl}:${item.text ?? ""}`,
          )
          .digest("hex");
        if (
          seen.has(`${item.sourceUrl}:${item.text ?? ""}`) &&
          item.form !== "IMAGE"
        )
          continue;
        seen.add(`${item.sourceUrl}:${item.text ?? ""}`);
        const snapshot = {
          ...item,
          sourceCategory: identity.sourceCategory,
          adaptation: identity.adaptation,
        };
        const row = await prisma.seasonCotsCandidate.upsert({
          where: {
            userId_identityId_contextId_sourceKey: {
              userId,
              identityId: identity.id,
              contextId: identity.discoveryContextId,
              sourceKey,
            },
          },
          create: {
            userId,
            seasonId: season.id,
            identityId: identity.id,
            contextId: identity.discoveryContextId,
            provider,
            sourceKey,
            kind: c.kind,
            snapshot: jsonValue(snapshot),
            expiresAt: new Date(Date.now() + 3_600_000),
          },
          update: {
            snapshot: jsonValue(snapshot),
            expiresAt: new Date(Date.now() + 3_600_000),
          },
        });
        result.items.push(
          candidateView(row.snapshot as unknown as ProviderCandidate, row.id),
        );
      }
      const nextProvider = page.next ? index : index + 1;
      if (page.next || nextProvider < route.length)
        result.nextCursor = encode({
          key: queryKey,
          provider: nextProvider,
          cursor: page.next,
          expires: Date.now() + 3_600_000,
        });
      if (result.items.some((v) => v.importable) || page.next) break;
    } catch (error) {
      if (!(error instanceof CotsProviderError)) throw error;
      result.sources.push({
        provider,
        status: error.status,
        message: error.message,
      });
    }
    result.nextCursor = null;
  }
  result.exhausted = !result.nextCursor;
  const current = await getCotsCollection(userId, c.year, c.quarter);
  if (current.identity?.discoveryContextId !== identity.discoveryContextId)
    throw new DirectionError(
      "The discovery context changed while searching.",
      undefined,
      409,
    );
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  if (
    !result.sources.some(({ status }) =>
      ["THROTTLED", "UNAVAILABLE"].includes(status),
    )
  )
    cache.set(cacheKey, {
      expires: Date.now() + (result.items.length ? 15 * 60_000 : 30_000),
      page: result,
    });
  return result;
}
