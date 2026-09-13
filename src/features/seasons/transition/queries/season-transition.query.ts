import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import { Prisma } from "@/generated/prisma/client";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { participatedSessionSeasonsSql } from "@/features/sessions/measurements/queries/session-participation.query";
import {
  reviewSourcesSql,
  REVIEW_DOMAINS,
} from "@/features/reviews/facts/queries/review-sources.query";
import { readReviewView } from "@/features/reviews/persistence/queries/review.query";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import {
  reviewPeriod,
  reviewHref,
} from "@/features/reviews/periods/utils/review-period.util";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import {
  storedDate,
  DirectionError,
} from "@/features/direction/services/direction-mutation.service";
import type {
  SeasonTransitionView,
  CarryForwardSuggestion,
  PeriodReviewFacts,
  ReviewWriting,
} from "@/features/reviews/contracts/types/review.types";

function savedSeasonParticipationSql(userId: string) {
  return Prisma.sql`SELECT make_date(year,(quarter-1)*3+1,1) AS start_on FROM user_season s WHERE "userId"=${userId} AND ("openingCompletedAt" IS NOT NULL OR title<>'' OR intention<>'' OR COALESCE(character->>'name','')<>'' OR COALESCE(character->'standards','[]'::jsonb)<>'[]'::jsonb OR EXISTS(SELECT 1 FROM jsonb_each_text(answers) a WHERE a.key IN ('carryForward','leaveBehind','protect','meaningful') AND a.value<>'') OR EXISTS(SELECT 1 FROM season_goal g WHERE g."seasonId"=s.id AND g."userId"=${userId}))`;
}
export async function latestParticipatedSeason(
  tx: DirectionTx,
  userId: string,
  at = new Date(),
): Promise<string | null> {
  const current = getSeasonForDate(
    DateTime.fromJSDate(at).setZone("Europe/Amsterdam"),
  );
  const scope = {
    userId,
    start: new Date("1900-01-01T00:00:00Z"),
    end: current.start.toJSDate(),
    at,
  };
  const rows = await tx.$queryRaw<
    { startOn: Date }[]
  >(Prisma.sql`WITH evidence AS (${reviewSourcesSql(
    scope,
    REVIEW_DOMAINS.filter((d) => d !== "sessions"),
  )}), candidates AS (
    SELECT date_trunc('quarter',("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Amsterdam')::date AS start_on FROM evidence
    UNION ${participatedSessionSeasonsSql(userId, scope.end, at)}
    UNION ${savedSeasonParticipationSql(userId)}
    UNION SELECT "fromStartOn" FROM season_transition WHERE "userId"=${userId}
    UNION SELECT "startOn" FROM review WHERE "userId"=${userId} AND timeframe='season' AND (COALESCE(writing->>'reflection','')<>'' OR COALESCE(writing->>'carryForward','')<>'' OR COALESCE(writing->>'leaveBehind','')<>'')
    UNION SELECT date_trunc('quarter',("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Amsterdam')::date FROM direction_goal WHERE "userId"=${userId} AND "createdAt"<${scope.end}
    UNION SELECT date_trunc('quarter',("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Amsterdam')::date FROM experiment WHERE "userId"=${userId} AND "createdAt"<${scope.end}
  ) SELECT MAX(start_on) AS "startOn" FROM candidates WHERE start_on<${storedDate(current.start.toISODate()!)}`);
  return rows[0]?.startOn?.toISOString().slice(0, 10) ?? null;
}
export async function hasSeasonParticipation(
  tx: DirectionTx,
  userId: string,
  startOn: string,
  at: Date,
) {
  const p = reviewPeriod("season", startOn, at),
    scope = {
      userId,
      start: new Date(p.start),
      end: new Date(p.evaluatedThrough),
      at,
    };
  const rows = await tx.$queryRaw<{ participated: boolean }[]>(
    Prisma.sql`SELECT EXISTS(SELECT 1 FROM (${savedSeasonParticipationSql(userId)}) p WHERE start_on=${storedDate(startOn)}) OR EXISTS(SELECT 1 FROM (${reviewSourcesSql(scope)}) e) OR EXISTS(SELECT 1 FROM direction_goal WHERE "userId"=${userId} AND "createdAt">=${scope.start} AND "createdAt"<${scope.end}) OR EXISTS(SELECT 1 FROM experiment WHERE "userId"=${userId} AND "createdAt">=${scope.start} AND "createdAt"<${scope.end}) OR EXISTS(SELECT 1 FROM review WHERE "userId"=${userId} AND timeframe='season' AND "startOn"=${storedDate(startOn)} AND (COALESCE(writing->>'reflection','')<>'' OR COALESCE(writing->>'carryForward','')<>'' OR COALESCE(writing->>'leaveBehind','')<>'')) AS participated`,
  );
  return rows[0]?.participated ?? false;
}
export async function readSeasonTransition(
  tx: DirectionTx,
  userId: string,
  options: {
    startOn?: string;
    clientId?: string;
    replay?: boolean;
    includeReview?: boolean;
  } = {},
  at = new Date(),
): Promise<SeasonTransitionView> {
  const current = getSeasonForDate(
    DateTime.fromJSDate(at).setZone("Europe/Amsterdam"),
  );
  const [currentSeason, active, latestCandidate] = await Promise.all([
    tx.userSeason.findUnique({
      where: {
        userId_year_quarter: {
          userId,
          year: current.year,
          quarter: current.season,
        },
      },
      select: { openingCompletedAt: true, openingDeferredAt: true },
    }),
    tx.session.findFirst({
      where: { userId, endedAt: null },
      select: { id: true },
    }),
    latestParticipatedSeason(tx, userId, at),
  ]);
  const candidate = options.startOn ?? latestCandidate;
  const opened = !!currentSeason?.openingCompletedAt;
  const openingHref = `/direction/seasons/${current.year}/${current.season}/opening`;
  const row = candidate
    ? await tx.seasonTransition.findUnique({
        where: {
          userId_fromStartOn: { userId, fromStartOn: storedDate(candidate) },
        },
      })
    : null;
  const p = candidate ? reviewPeriod("season", candidate, at) : null;
  if (p && p.state !== "ENDED")
    throw new DirectionError(
      "A Season finale is available after its calendar quarter ends.",
    );
  const date = candidate ? DateTime.fromISO(candidate) : null;
  const from = date
    ? {
        year: date.year,
        quarter: Math.floor((date.month - 1) / 3) + 1,
        startOn: candidate!,
        label: p!.label,
      }
    : null;
  const disposition =
    (row?.disposition as SeasonTransitionView["disposition"]) ?? "AVAILABLE";
  const leaseActive = !!row?.leaseUntil && row.leaseUntil > at;
  const leaseOwned = leaseActive && row?.leaseToken === options.clientId;
  const replay =
    options.replay ??
    (!!options.startOn &&
      (["COMPLETED", "SKIPPED"].includes(disposition) ||
        candidate !== latestCandidate));
  const previewEdition =
    options.includeReview && candidate && !row?.editionId
      ? await tx.reviewEdition.findFirst({
          where: {
            userId,
            review: { timeframe: "season", startOn: storedDate(candidate) },
          },
          orderBy: { number: "desc" },
          select: { id: true },
        })
      : null;
  return {
    storageScope: reviewFingerprint({
      userId,
      fromStartOn: candidate ?? current.start.toISODate(),
    }),
    id: row?.id ?? null,
    version: row?.version ?? 0,
    from,
    disposition,
    movement: row?.movement ?? 0,
    completedMovements: row?.completedMovements ?? 0,
    autoEligible:
      !!from &&
      !active &&
      !replay &&
      ["AVAILABLE", "IN_PROGRESS"].includes(disposition) &&
      (!leaseActive || leaseOwned),
    occupied: !!active,
    leaseOwned,
    leaseUntil: row?.leaseUntil?.toISOString() ?? null,
    editionId: row?.editionId ?? null,
    finaleHref: from
      ? `/direction/seasons/${from.year}/${from.quarter}/finale`
      : null,
    destinationHref:
      replay && candidate
        ? reviewHref("season", candidate)
        : opened
          ? "/"
          : `${openingHref}?fromFinale=1`,
    destinationLabel: replay
      ? "Return to review"
      : opened
        ? "Return to Home"
        : "Open the next Season",
    openingComplete: opened,
    replay,
    review:
      options.includeReview && candidate
        ? await readReviewView(
            tx,
            userId,
            { timeframe: "season", startOn: candidate },
            row?.editionId ?? previewEdition?.id,
            at,
          )
        : null,
  };
}
export function getSeasonTransition(
  userId: string,
  options: Parameters<typeof readSeasonTransition>[2] = {},
  at = new Date(),
) {
  return prisma.$transaction(
    (tx) => readSeasonTransition(tx, userId, options, at),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export async function getCarryForwardSuggestion(
  userId: string,
  year: number,
  quarter: number,
): Promise<CarryForwardSuggestion | null> {
  const start = storedDate(
    `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`,
  );
  const edition = await prisma.reviewEdition.findFirst({
    where: { userId, review: { timeframe: "season", startOn: { lt: start } } },
    orderBy: [{ review: { startOn: "desc" } }, { number: "desc" }],
  });
  if (!edition) return null;
  const facts = edition.facts as unknown as PeriodReviewFacts,
    writing = edition.writing as unknown as ReviewWriting;
  return {
    editionId: edition.id,
    reviewHref:
      reviewHref("season", facts.period.startOn) + `?editionId=${edition.id}`,
    label: facts.identity.title,
    carryForward: writing.carryForward,
    leaveBehind: writing.leaveBehind,
    unfinished: facts.intentions
      .filter((i) => i.status !== "CONCLUDED")
      .map((i) => ({ id: i.id, title: i.title, href: i.href })),
  };
}
