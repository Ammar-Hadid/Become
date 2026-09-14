import { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
import { readSessionReviewDomainTime } from "@/features/sessions/measurements/queries/session-review-domain-time.query";
import { measurePacket } from "@/features/reviews/facts/utils/review-payload.util";
import { reviewMetrics } from "@/features/reviews/facts/mappers/review-metrics.mapper";
import { DateTime } from "luxon";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getPeriod, getPeriodBuckets } from "@/lib/dates/utils/period.util";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import { reviewIdentitySchema } from "@/features/reviews/contracts/schemas/review.schema";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  readReviewAggregates,
  readReviewMoments,
  reviewDefinitions,
  reviewSource,
  REVIEW_DOMAINS,
} from "./review-sources.query";
import {
  readReviewIdentity,
  readReviewSeasonChapters,
} from "./review-identity.query";
import { readReviewIntentions } from "@/features/direction/measurements/queries/review-intentions.query";
import type {
  PeriodReviewFacts,
  ReviewDomain,
} from "@/features/reviews/contracts/types/review.types";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";

export async function readReviewFacts(
  tx: DirectionTx,
  userId: string,
  input: unknown,
  at = new Date(),
  domains: ReviewDomain[] = REVIEW_DOMAINS,
  selected: string[] = [],
): Promise<PeriodReviewFacts> {
  const identity = reviewIdentitySchema.parse(input),
    period = reviewPeriod(identity.timeframe, identity.startOn, at);
  const scope = {
    userId,
    start: new Date(period.start),
    end: new Date(period.evaluatedThrough),
    at,
  };
  const priorScope = {
    ...scope,
    start: new Date(period.comparison.start),
    end: new Date(period.comparison.end),
  };
  const [current, previous, momentRows, season, intentions, seasonChapters] =
    await Promise.all([
      readReviewAggregates(tx, scope, domains),
      period.comparison.available
        ? readReviewAggregates(tx, priorScope, domains)
        : [],
      readReviewMoments(tx, scope, domains, selected),
      readReviewIdentity(tx, userId, period),
      domains.includes("direction")
        ? readReviewIntentions(tx, userId, period)
        : { items: [], omitted: 0 },
      readReviewSeasonChapters(tx, userId, period),
    ]);
  const metrics = reviewMetrics(current, previous, period, domains);
  const totalSeconds = Number(
    current.find((m) => m.metricKey === "sessions.focused")?.value ?? 0,
  );
  const buckets = getPeriodBuckets(
    getPeriod(
      DateTime.fromISO(period.startOn, { zone: "Europe/Amsterdam" }),
      period.timeframe,
    ),
  );
  let allocations: { label: string; seconds: number; share: number }[] = [],
    chart: { label: string; start: string; end: string; seconds: number }[] =
      [],
    provisional = 0;
  if (domains.includes("sessions")) {
    const focused = sessionFocusedSecondsSql("s", scope, at);
    const [groups, active, points] = await Promise.all([
      tx.$queryRaw<{ label: string; seconds: string }[]>(
        Prisma.sql`SELECT d.name AS label,SUM(${focused})::text AS seconds FROM session s JOIN domain d ON d.id=s."domainId" AND d."userId"=s."userId" WHERE s."userId"=${userId} AND s."endedAt" IS NOT NULL AND s."startedAt"<${scope.end} AND s."endedAt">${scope.start} GROUP BY d.id,d.name ORDER BY SUM(${focused}) DESC,d.id`,
      ),
      tx.$queryRaw<{ seconds: string }[]>(
        Prisma.sql`SELECT COALESCE(SUM(${focused}),0)::text AS seconds FROM session s WHERE s."userId"=${userId} AND s."endedAt" IS NULL AND s."startedAt"<${scope.end}`,
      ),
      tx.$queryRaw<
        { label: string; start: Date; end: Date; seconds: string }[]
      >(
        Prisma.sql`WITH buckets(label,start_at,end_at) AS (VALUES ${Prisma.join(buckets.map((b) => Prisma.sql`(${b.label},${b.start.toJSDate()}::timestamp,${b.end.toJSDate()}::timestamp)`))}) SELECT b.label,b.start_at AS start,b.end_at AS end,COALESCE((SELECT SUM(${sessionFocusedSecondsSql("s", { start: Prisma.sql`b.start_at`, end: Prisma.sql`LEAST(b.end_at,${scope.end})` }, at)}) FROM session s WHERE s."userId"=${userId} AND s."endedAt" IS NOT NULL AND s."startedAt"<LEAST(b.end_at,${scope.end}) AND s."endedAt">b.start_at),0)::text AS seconds FROM buckets b ORDER BY b.start_at`,
      ),
    ]);
    allocations = groups.map((g) => ({
      label: g.label,
      seconds: Number(g.seconds),
      share: totalSeconds ? Number(g.seconds) / totalSeconds : 0,
    }));
    provisional = Number(active[0]?.seconds ?? 0);
    chart = points.map((p) => ({
      label: p.label,
      start: p.start.toISOString(),
      end: p.end.toISOString(),
      seconds: Number(p.seconds),
    }));
  }
  const domainBreakdown = domains.includes("sessions")
    ? await readSessionReviewDomainTime(tx, userId, scope, buckets, at)
    : undefined;
  const candidates = momentRows.map((r) => ({
    ...reviewSource(r),
    selected: selected.includes(r.key),
    selectionReason: selected.includes(r.key)
      ? "Selected by you"
      : "Recent explicit source record; chronological selection, without an importance score.",
  }));
  const moments = [
    ...candidates.filter((m) => m.selected),
    ...candidates.filter((m) => !m.selected),
  ]
    .slice(0, Math.max(selected.length, period.timeframe === "week" ? 6 : 18))
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) || b.key.localeCompare(a.key),
    );
  const availableMoments = current
    .filter((r) =>
      reviewDefinitions.some(
        (d) =>
          d.moment &&
          (r.metricKey === d.key || r.metricKey.startsWith(d.key + ":")),
      ),
    )
    .reduce((sum, r) => sum + r.count, 0);
  const facts: PeriodReviewFacts = {
    schemaVersion: 1,
    metricVersion: 1,
    audience: domains.includes("entrepreneurship")
      ? { version: 1, summary: await getAudienceMetrics(userId, scope, tx) }
      : undefined,
    fingerprint: "",
    referenceTime: at.toISOString(),
    period,
    domains,
    metrics,
    seasonChapters,
    sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS",
    time: {
      seconds: totalSeconds,
      provisionalSeconds: provisional,
      provisionalLabel: provisional
        ? "Unfinished session contribution, pause-aware and provisional; excluded from completed totals."
        : null,
      allocations,
      buckets: chart,
      ...(domainBreakdown ? { domainBreakdown } : {}),
    },
    identity: season,
    intentions: intentions.items,
    moments,
    coverage: domains.map((domain) => {
      const recorded = current.some((r) =>
        reviewDefinitions.some(
          (d) =>
            d.domain === domain &&
            (r.metricKey === d.key || r.metricKey.startsWith(d.key + ":")),
        ),
      );
      return {
        domain,
        state: recorded ? "RECORDED" : "NOT_RECORDED",
        detail: recorded
          ? "Qualified records are available. Absence of other records does not establish inactivity."
          : "No qualifying records in this window; recorded counts are zero, while unrecorded outcomes remain unknown.",
      };
    }),
    warnings: [
      "Facts use evidence available at evaluation time, including later corrections. They do not reconstruct everything known historically.",
      "Money is separated by currency and classification. Business receipt allocations are a perspective on Finance money, not additional income.",
      ...(period.state === "OPEN"
        ? [
            "This period is unfinished. Its final review becomes available after the calendar period ends.",
          ]
        : []),
      ...(period.comparison.mode === "FULL_CALENDAR"
        ? [
            "The comparison uses complete calendar periods; their lengths may differ.",
          ]
        : []),
      ...(period.state === "OPEN" && !period.comparison.available
        ? [
            "An equal elapsed comparison is unavailable because the previous calendar period is shorter.",
          ]
        : []),
    ],
    omitted: {
      moments: Math.max(0, availableMoments - moments.length),
      intentions: intentions.omitted,
    },
    payloadBytes: 0,
  };
  const digest = () =>
    reviewFingerprint({
      schemaVersion: 1,
      metricVersion: 1,
      period: {
        timeframe: period.timeframe,
        start: period.start,
        end: period.end,
        state: period.state,
        comparisonMode: period.comparison.mode,
      },
      domains,
      current,
      previous,
      identity: season,
      seasonChapters,
      intentions: facts.intentions,
      moments: facts.moments,
      time: facts.time,
      audience: facts.audience,
      coverage: facts.coverage,
      omitted: facts.omitted,
    });
  facts.fingerprint = digest();
  measurePacket(facts);
  while (
    facts.payloadBytes > 96 * 1024 &&
    facts.moments.some((m) => !m.selected)
  ) {
    const index = facts.moments.findLastIndex((m) => !m.selected);
    facts.moments.splice(index, 1);
    facts.omitted.moments++;
    facts.fingerprint = digest();
    measurePacket(facts);
  }
  if (facts.payloadBytes > 96 * 1024)
    throw Error("Review facts exceed their bounded payload budget");
  return facts;
}
export function getReviewFacts(
  userId: string,
  input: unknown,
  at = new Date(),
  domains = REVIEW_DOMAINS,
) {
  return prisma.$transaction(
    (tx) => readReviewFacts(tx, userId, input, at, domains),
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
