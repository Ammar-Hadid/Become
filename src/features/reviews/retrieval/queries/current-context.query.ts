import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getPeriod } from "@/lib/dates/utils/period.util";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import { readReviewIdentity } from "@/features/reviews/facts/queries/review-identity.query";
import {
  readReviewAggregates,
  readReviewMoments,
  reviewSource,
  reviewDefinitions,
} from "@/features/reviews/facts/queries/review-sources.query";
import { reviewMetrics } from "@/features/reviews/facts/mappers/review-metrics.mapper";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  measurePacket,
  boundedExcerpt,
} from "@/features/reviews/facts/utils/review-payload.util";
import { readContextIntentions } from "@/features/direction/measurements/queries/context-intentions.query";
import { currentContextRequestSchema } from "@/features/reviews/retrieval/schemas/retrieval.schema";
import type { CurrentContextSummary } from "@/features/reviews/retrieval/types/retrieval.types";

export async function getCurrentContext(
  userId: string,
  input: unknown = {},
  at = new Date(),
): Promise<CurrentContextSummary> {
  const { domains } = currentContextRequestSchema.parse(input),
    now = DateTime.fromJSDate(at).setZone("Europe/Amsterdam");
  const period = reviewPeriod(
      "season",
      getPeriod(now, "season").start.toISODate()!,
      at,
    ),
    recent = reviewPeriod(
      "week",
      getPeriod(now, "week").start.toISODate()!,
      at,
    );
  return prisma.$transaction(
    async (tx) => {
      const identity = await readReviewIdentity(tx, userId, period),
        intentions = await readContextIntentions(tx, userId, identity.seasonId);
      const scope = {
        userId,
        start: new Date(recent.start),
        end: new Date(recent.evaluatedThrough),
        at,
      };
      const aggregate = await readReviewAggregates(tx, scope, domains);
      const previous = recent.comparison.available
        ? await readReviewAggregates(
            tx,
            {
              ...scope,
              start: new Date(recent.comparison.start),
              end: new Date(recent.comparison.end),
            },
            domains,
          )
        : [];
      const moments = await readReviewMoments(tx, scope, domains, []);
      const packet: CurrentContextSummary = {
        schemaVersion: 1,
        metricVersion: 1,
        fingerprint: "",
        referenceTime: at.toISOString(),
        period,
        sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS",
        season: {
          id: identity.seasonId,
          title: boundedExcerpt(identity.title, 600),
          intention: boundedExcerpt(identity.intention, 1800),
          year: identity.year,
          quarter: identity.quarter,
          persona: identity.persona,
          fingerprint: reviewFingerprint(identity),
        },
        priorities: intentions.priorities,
        activeIntentions: intentions.activeIntentions,
        recent: {
          period: recent,
          domains,
          metrics: reviewMetrics(aggregate, previous, recent, domains),
          sources: moments.slice(0, 5).map(reviewSource),
        },
        coverage: domains.map((domain) => ({
          domain,
          state: aggregate.some((r) =>
            reviewDefinitions.some(
              (d) =>
                d.domain === domain &&
                (r.metricKey === d.key || r.metricKey.startsWith(d.key + ":")),
            ),
          )
            ? "RECORDED"
            : "NOT_RECORDED",
          detail:
            "Current qualified records only. Missing records do not establish inactivity.",
        })),
        omitted: {
          activeIntentions: intentions.omitted,
          recentSources: Math.max(
            0,
            aggregate.reduce((n, r) => n + r.count, 0) -
              Math.min(moments.length, 5),
          ),
        },
        warnings: [
          "Active intentions are selected by recent edits, with saved Season priorities supplied separately. Retrieve an intention for its qualified criterion evaluation.",
          "Long Season wording and intention descriptions are excerpted; source records retain the complete text. Default context excludes full scripts, notes, media bytes and histories. User choices constrain the future grounded COTS profile.",
        ],
        payloadBytes: 0,
      };
      const seal = () => {
        packet.fingerprint = reviewFingerprint({
          season: packet.season,
          priorities: packet.priorities,
          active: packet.activeIntentions,
          aggregate,
          previous,
          sources: packet.recent.sources,
          coverage: packet.coverage,
          omitted: packet.omitted,
          scope: { start: recent.start, end: recent.end, domains },
        });
        measurePacket(packet);
      };
      seal();
      while (packet.payloadBytes > 32 * 1024 && packet.recent.sources.length) {
        packet.recent.sources.pop();
        packet.omitted.recentSources++;
        seal();
      }
      while (
        packet.payloadBytes > 32 * 1024 &&
        packet.activeIntentions.length
      ) {
        packet.activeIntentions.pop();
        packet.omitted.activeIntentions++;
        seal();
      }
      if (packet.payloadBytes > 32 * 1024)
        throw Error("Current context exceeds its payload budget");
      return packet;
    },
    { isolationLevel: "RepeatableRead", timeout: 25000 },
  );
}
