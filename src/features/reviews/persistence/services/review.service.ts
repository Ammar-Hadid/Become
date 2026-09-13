import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  jsonValue,
  requireVersion,
  retryDirectionTransaction,
  storedDate,
  lockDirection,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import {
  reviewCommandSchema,
  reviewWritingSchema,
} from "@/features/reviews/contracts/schemas/review.schema";
import { readReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  reviewSourcesSql,
  REVIEW_DOMAINS,
} from "@/features/reviews/facts/queries/review-sources.query";
import {
  getReviewView,
  emptyReviewWriting,
} from "@/features/reviews/persistence/queries/review.query";
import type {
  PeriodReviewFacts,
  ReviewWriting,
} from "@/features/reviews/contracts/types/review.types";
import { lockSeason } from "@/features/seasons/services/season.service";

export async function lockReview(
  tx: DirectionTx,
  userId: string,
  timeframe: string,
  startOn: string,
) {
  await lockDirection(tx, userId, `review:${timeframe}:${startOn}`);
  return tx.review.findUnique({
    where: {
      userId_timeframe_startOn: {
        userId,
        timeframe,
        startOn: storedDate(startOn),
      },
    },
  });
}
export async function captureReviewEdition(
  tx: DirectionTx,
  userId: string,
  reviewId: string,
  kind: "PRESENTATION" | "FINALIZED" | "AMENDMENT",
  facts: PeriodReviewFacts,
  writing: ReviewWriting,
  supersedesId?: string,
) {
  const latest = await tx.reviewEdition.findFirst({
    where: { userId, reviewId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const edition = await tx.reviewEdition.create({
    data: {
      userId,
      reviewId,
      number: (latest?.number ?? 0) + 1,
      kind,
      fingerprint: reviewFingerprint({
        facts: facts.fingerprint,
        writing,
        kind,
      }),
      factsFingerprint: facts.fingerprint,
      facts: jsonValue(facts),
      writing: jsonValue(writing),
      supersedesId,
      capturedAt: new Date(facts.referenceTime),
    },
  });
  const scope = {
    userId,
    start: new Date(facts.period.start),
    end: new Date(facts.period.evaluatedThrough),
    at: new Date(facts.referenceTime),
  };
  // Complete evidence manifests are copied inside the same transaction, without loading full histories into JS.
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO review_edition_source(id,"userId","editionId",key,"metricKey","occurredAt",snapshot) SELECT ${edition.id}||':'||md5(s.key),${userId},${edition.id},s.key,s."metricKey",s."occurredAt",(to_jsonb(s)-'moment')||jsonb_build_object('occurredAt',to_char(s."occurredAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) FROM (${reviewSourcesSql(scope, facts.domains ?? REVIEW_DOMAINS)}) s`,
  );
  return edition;
}
export async function mutateReview(
  userId: string,
  input: unknown,
  at = new Date(),
) {
  const c = reviewCommandSchema.parse(input),
    hash = reviewFingerprint(c),
    identity = { timeframe: c.timeframe, startOn: c.startOn };
  const result = await retryDirectionTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const old = await lockReview(tx, userId, c.timeframe, c.startOn);
        const prior = await tx.reviewMutation.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: c.operationKey },
          },
        });
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This operation key belongs to different review input.",
              undefined,
              409,
            );
          return prior.result as { editionId?: string };
        }
        requireVersion(old?.version ?? 0, c.expectedVersion);
        const writing =
          c.type === "FINALIZE"
            ? reviewWritingSchema.parse(old?.writing ?? emptyReviewWriting())
            : c.writing;
        const latest = old
          ? await tx.reviewEdition.findFirst({
              where: {
                userId,
                reviewId: old.id,
                kind: { in: ["FINALIZED", "AMENDMENT"] },
              },
              orderBy: { number: "desc" },
            })
          : null;
        if (c.type === "SAVE" && latest)
          throw new DirectionError(
            "This review is finalized. Create an explicit amendment to preserve the previous edition.",
            undefined,
            409,
          );
        if (c.type === "FINALIZE" && latest)
          throw new DirectionError(
            "This review already has a final edition.",
            undefined,
            409,
          );
        if (c.type === "AMEND" && latest?.id !== c.supersedesId)
          throw new DirectionError(
            "A newer edition exists. Review it before amending.",
            undefined,
            409,
          );
        const facts = await readReviewFacts(
          tx,
          userId,
          identity,
          at,
          undefined,
          writing.selectedMomentKeys,
        );
        if (c.type !== "SAVE") {
          if (facts.period.state !== "ENDED")
            throw new DirectionError(
              "Finalize after this calendar period ends.",
            );
          // Amendment selections may differ: compare the preview using the stored draft selection first.
          const preview =
            c.type === "AMEND"
              ? await readReviewFacts(
                  tx,
                  userId,
                  identity,
                  at,
                  undefined,
                  reviewWritingSchema.parse(
                    old?.writing ?? emptyReviewWriting(),
                  ).selectedMomentKeys,
                )
              : facts;
          if (preview.fingerprint !== c.fingerprint)
            throw new DirectionError(
              "Evidence changed since the preview. Your writing is preserved; refresh the facts before finalizing.",
              "fingerprint",
              409,
            );
        }
        if (
          writing.selectedMomentKeys.some(
            (key) => !facts.moments.some((m) => m.key === key),
          )
        )
          throw new DirectionError(
            "A selected moment changed or no longer qualifies. Inspect the live sources before saving.",
            "selectedMomentKeys",
            409,
          );
        const row = old
          ? await tx.review.update({
              where: { id: old.id },
              data: { writing: jsonValue(writing), version: { increment: 1 } },
            })
          : await tx.review.create({
              data: {
                userId,
                ...identity,
                startOn: storedDate(c.startOn),
                writing: jsonValue(writing),
              },
            });
        const edition =
          c.type === "SAVE"
            ? null
            : await captureReviewEdition(
                tx,
                userId,
                row.id,
                c.type === "AMEND" ? "AMENDMENT" : "FINALIZED",
                facts,
                writing,
                c.type === "AMEND" ? c.supersedesId : undefined,
              );
        if (edition && c.timeframe === "season") {
          const { year, quarter } = facts.identity;
          const season = await lockSeason(tx, userId, year, quarter);
          // Preserve legacy snapshots. Review editions own the richer closing meaning.
          if (season && !season.closedAt) {
            const closed = await tx.userSeason.update({
              where: { id: season.id },
              data: {
                closedAt: at,
                closingNote: writing.reflection,
                readyForReview: true,
                version: { increment: 1 },
              },
            });
            await tx.seasonChange.create({
              data: {
                userId,
                seasonId: season.id,
                version: closed.version,
                operationKey: `review-${c.operationKey}`,
                fingerprint: edition.fingerprint,
                kind: "REVIEW_FINALIZED",
                reason:
                  "Season review finalized; canonical goals and experiments retain independent outcomes.",
                snapshot: jsonValue({
                  reviewId: row.id,
                  editionId: edition.id,
                  factsFingerprint: facts.fingerprint,
                }),
              },
            });
          }
        }
        const result = { ...(edition ? { editionId: edition.id } : {}) };
        await tx.reviewMutation.create({
          data: {
            userId,
            operationKey: c.operationKey,
            fingerprint: hash,
            result: jsonValue(result),
          },
        });
        return result;
      },
      { isolationLevel: "Serializable", timeout: 30000 },
    ),
  );
  return {
    error: null,
    view: await getReviewView(userId, identity, result.editionId, at),
  };
}
