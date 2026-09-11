import { DateTime } from "luxon";
import type {
  SeasonMediaView,
  SeasonQuoteView,
} from "@/features/seasons/types/season.types";
import type { SeasonPresentation } from "@/features/seasons/discovery/types/cots-discovery.types";
function pick<T extends { id: string }>(
  items: T[],
  key: string,
): string | null {
  if (!items.length) return null;
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return [...items].sort((a, b) => a.id.localeCompare(b.id))[
    (hash >>> 0) % items.length
  ].id;
}
export function seasonPresentation(
  seasonId: string,
  identityId: string,
  media: SeasonMediaView[],
  quotes: SeasonQuoteView[],
  cadence: string | null,
  now = DateTime.now().setZone("Europe/Amsterdam"),
): SeasonPresentation {
  const key = `${seasonId}:${identityId}`,
    week = `${now.weekYear}-${now.weekNumber}`,
    date = now.toISODate();
  const eligibleQuotes = quotes.filter((v) => v.rotation === true);
  return {
    key: `${key}:${week}:${date}:${cadence ?? ""}`,
    secondaryMediaId: pick(
      media.filter((v) => v.secondary !== false && !v.poster),
      `${key}:week:${week}`,
    ),
    quoteId: pick(eligibleQuotes, `${key}:day:${date}`),
    loadingMediaId: pick(
      media.filter((v) => v.loading !== false && Boolean(v.previewHref)),
      `${key}:loading`,
    ),
    cadenceMediaId: cadence
      ? pick(
          media.filter((v) => v.cadence !== false),
          `${key}:${cadence}`,
        )
      : null,
    cadenceQuoteId: cadence ? pick(eligibleQuotes, `${key}:${cadence}`) : null,
  };
}
