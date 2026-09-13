import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { DateTime } from "luxon";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import {
  DirectionError,
  storedDate,
} from "@/features/direction/services/direction-mutation.service";
import {
  reviewIdentitySchema,
  reviewWritingSchema,
} from "@/features/reviews/contracts/schemas/review.schema";
import { readReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { reviewHref } from "@/features/reviews/periods/utils/review-period.util";
import type {
  PeriodReviewFacts,
  ReviewView,
  ReviewWriting,
  ReviewEditionSummary,
  ReviewHistory,
} from "@/features/reviews/contracts/types/review.types";
import type { ReviewEdition } from "@/generated/prisma/client";
export const emptyReviewWriting = (): ReviewWriting => ({
  reflection: "",
  carryForward: "",
  leaveBehind: "",
  selectedMomentKeys: [],
});
export const editionSummary = (
  e: Pick<
    ReviewEdition,
    "id" | "number" | "kind" | "capturedAt" | "fingerprint" | "supersedesId"
  >,
): ReviewEditionSummary => ({
  ...e,
  kind: e.kind as ReviewEditionSummary["kind"],
  capturedAt: e.capturedAt.toISOString(),
});
export async function readReviewView(
  tx: DirectionTx,
  userId: string,
  input: unknown,
  editionId?: string,
  at = new Date(),
): Promise<ReviewView> {
  const identity = reviewIdentitySchema.parse(input);
  const row = await tx.review.findUnique({
    where: {
      userId_timeframe_startOn: {
        userId,
        timeframe: identity.timeframe,
        startOn: storedDate(identity.startOn),
      },
    },
  });
  const editions = row
    ? await tx.reviewEdition.findMany({
        where: { reviewId: row.id, userId },
        orderBy: { number: "desc" },
        select: {
          id: true,
          number: true,
          kind: true,
          capturedAt: true,
          fingerprint: true,
          factsFingerprint: true,
          supersedesId: true,
        },
        take: 50,
      })
    : [];
  const edition = editionId
    ? await tx.reviewEdition.findFirst({
        where: { id: editionId, userId, reviewId: row?.id ?? "" },
      })
    : null;
  if (editionId && !edition)
    throw new DirectionError("Review edition not found.", undefined, 404);
  const writing = reviewWritingSchema.parse(
    row?.writing ?? emptyReviewWriting(),
  );
  const live = edition
    ? null
    : await readReviewFacts(
        tx,
        userId,
        identity,
        at,
        undefined,
        writing.selectedMomentKeys,
      );
  const latest = editions.find((e) => e.kind !== "PRESENTATION");
  const facts = edition
    ? (edition.facts as unknown as PeriodReviewFacts)
    : live!;
  const href = reviewHref(identity.timeframe, identity.startOn);
  const date = DateTime.fromISO(identity.startOn);
  return {
    storageScope: reviewFingerprint({ userId, ...identity }),
    id: row?.id ?? null,
    version: row?.version ?? 0,
    facts,
    writing: edition ? reviewWritingSchema.parse(edition.writing) : writing,
    edition: edition ? editionSummary(edition) : null,
    editions: editions.map(editionSummary),
    liveChanged:
      !!live && !!latest && latest.factsFingerprint !== live.fingerprint,
    liveComparisonAvailable: !!live,
    canFinalize: !edition && !latest && facts.period.state === "ENDED",
    reviewHref: href,
    finaleHref:
      identity.timeframe === "season" && facts.period.state === "ENDED"
        ? `/direction/seasons/${date.year}/${Math.floor((date.month - 1) / 3) + 1}/finale`
        : null,
  };
}
export async function getReviewView(
  userId: string,
  input: unknown,
  editionId?: string,
  at = new Date(),
) {
  const view = await prisma.$transaction(
    (tx) => readReviewView(tx, userId, input, editionId, at),
    { isolationLevel: "RepeatableRead", timeout: 25000 },
  );
  if (!editionId) return view;
  // A failed live read must never prevent replay of an immutable edition.
  try {
    const live = await prisma.$transaction(
      (tx) => readReviewView(tx, userId, input, undefined, at),
      { isolationLevel: "RepeatableRead", timeout: 25000 },
    );
    return {
      ...view,
      liveComparisonAvailable: true,
      liveChanged: live.facts.fingerprint !== view.facts.fingerprint,
    };
  } catch (error) {
    console.error("Saved review live comparison unavailable", error);
    return view;
  }
}
export async function getReviewHistory(
  userId: string,
  cursor?: string,
): Promise<ReviewHistory> {
  const rows = await prisma.review.findMany({
    where: { userId, ...(cursor ? { id: { lt: cursor } } : {}) },
    select: {
      id: true,
      timeframe: true,
      startOn: true,
      updatedAt: true,
      editions: {
        where: { kind: { in: ["FINALIZED", "AMENDMENT"] } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { id: "desc" },
    take: 26,
  });
  return {
    items: rows.slice(0, 25).map((r) => {
      const startOn = r.startOn.toISOString().slice(0, 10),
        timeframe = r.timeframe as "week" | "month" | "season" | "year";
      return {
        timeframe,
        startOn,
        label: `${timeframe[0].toUpperCase() + timeframe.slice(1)} · ${startOn}`,
        href: reviewHref(timeframe, startOn),
        title: "",
        status: r.editions.length ? "FINALIZED" : "DRAFT",
        updatedAt: r.updatedAt.toISOString(),
      };
    }),
    nextCursor: rows.length > 25 ? rows[24].id : null,
  };
}
