import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { transitionCommandSchema } from "@/features/reviews/contracts/schemas/review.schema";
import {
  DirectionError,
  lockDirection,
  requireVersion,
  storedDate,
  retryDirectionTransaction,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { lockTimer } from "@/features/sessions/lifecycle/services/timer-mutation.service";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import {
  lockReview,
  captureReviewEdition,
} from "@/features/reviews/persistence/services/review.service";
import { readReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { emptyReviewWriting } from "@/features/reviews/persistence/queries/review.query";
import {
  getSeasonTransition,
  hasSeasonParticipation,
} from "@/features/seasons/transition/queries/season-transition.query";
import type { ReviewWriting } from "@/features/reviews/contracts/types/review.types";

export async function mutateSeasonTransition(
  userId: string,
  input: unknown,
  at = new Date(),
) {
  const c = transitionCommandSchema.parse(input),
    hash = reviewFingerprint(c);
  reviewPeriod("season", c.startOn, at);
  await retryDirectionTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        // Match timer lock order so BEGIN cannot race an unfinished timer creation.
        await lockTimer(tx, userId);
        await lockDirection(tx, userId, `transition:${c.startOn}`);
        const prior = await tx.reviewMutation.findUnique({
          where: {
            userId_operationKey: { userId, operationKey: c.operationKey },
          },
        });
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new DirectionError(
              "This operation key belongs to different transition input.",
              undefined,
              409,
            );
          return;
        }
        const old = await tx.seasonTransition.findUnique({
          where: {
            userId_fromStartOn: { userId, fromStartOn: storedDate(c.startOn) },
          },
        });
        // Deferral must also win over an in-flight BEGIN from this same tab.
        if (!(c.type === "DEFER" && old?.leaseToken === c.clientId))
          requireVersion(old?.version ?? 0, c.expectedVersion);
        const ended = reviewPeriod("season", c.startOn, at).state === "ENDED";
        if (!ended) throw new DirectionError("This Season has not ended.");
        const terminal =
          old && ["COMPLETED", "SKIPPED"].includes(old.disposition);
        if (terminal)
          throw new DirectionError(
            "This transition is already complete. Use replay from its review.",
            undefined,
            409,
          );
        const leaseOther =
          old?.leaseUntil &&
          old.leaseUntil > at &&
          old.leaseToken !== c.clientId;
        if (leaseOther)
          throw new DirectionError(
            "This finale is open in another tab. Return there or wait for its session to expire.",
            undefined,
            409,
          );
        if (
          !old &&
          c.type !== "BEGIN" &&
          !(await hasSeasonParticipation(tx, userId, c.startOn, at))
        )
          throw new DirectionError(
            "There is no saved participation to recap for this Season.",
          );
        let editionId = old?.editionId ?? null;
        if (c.type === "BEGIN") {
          if (
            await tx.session.findFirst({
              where: { userId, endedAt: null },
              select: { id: true },
            })
          )
            throw new DirectionError(
              "Your running or paused session comes first. Return to the finale when you are ready.",
              undefined,
              409,
            );
          const review = await lockReview(tx, userId, "season", c.startOn);
          if (!editionId) {
            if (
              c.previewReviewVersion !== undefined &&
              c.previewReviewVersion !== (review?.version ?? 0)
            )
              throw new DirectionError(
                "The review writing changed since this preview. Reload before beginning.",
                undefined,
                409,
              );
            const existing = review
              ? await tx.reviewEdition.findFirst({
                  where: { userId, reviewId: review.id },
                  orderBy: { number: "desc" },
                })
              : null;
            if (
              c.previewEditionId !== undefined &&
              c.previewEditionId !== (existing?.id ?? null)
            )
              throw new DirectionError(
                "The selected edition changed since this preview. Reload before beginning.",
                undefined,
                409,
              );
            if (existing) {
              if (
                c.factsFingerprint &&
                c.factsFingerprint !== existing.factsFingerprint
              )
                throw new DirectionError(
                  "The saved edition changed since this preview. Reload before beginning.",
                  undefined,
                  409,
                );
              editionId = existing.id;
            } else {
              const writing = (review?.writing ??
                emptyReviewWriting()) as ReviewWriting;
              const facts = await readReviewFacts(
                tx,
                userId,
                { timeframe: "season", startOn: c.startOn },
                at,
                undefined,
                writing.selectedMomentKeys,
              );
              if (!(await hasSeasonParticipation(tx, userId, c.startOn, at)))
                throw new DirectionError(
                  "There is no saved participation to recap for this Season.",
                );
              if (
                c.factsFingerprint &&
                c.factsFingerprint !== facts.fingerprint
              )
                throw new DirectionError(
                  "Evidence changed since this preview. Reload before beginning.",
                  undefined,
                  409,
                );
              const r =
                review ??
                (await tx.review.create({
                  data: {
                    userId,
                    timeframe: "season",
                    startOn: storedDate(c.startOn),
                    writing: jsonValue(writing),
                  },
                }));
              editionId = (
                await captureReviewEdition(
                  tx,
                  userId,
                  r.id,
                  "PRESENTATION",
                  facts,
                  writing,
                )
              ).id;
            }
          }
        } else if (
          !["DEFER", "SKIP"].includes(c.type) &&
          (!old || !editionId || old.leaseToken !== c.clientId)
        )
          throw new DirectionError(
            "Open this finale before advancing it.",
            undefined,
            409,
          );
        const disposition =
          c.type === "DEFER"
            ? "DEFERRED"
            : c.type === "SKIP"
              ? "SKIPPED"
              : c.type === "COMPLETE"
                ? "COMPLETED"
                : "IN_PROGRESS";
        const movement =
          c.type === "ADVANCE"
            ? (c.movement ?? old?.movement ?? 0)
            : (old?.movement ?? 0);
        // Numbered scene navigation can select any movement. The high-water
        // marker records navigation only; it does not assert that text was read.
        if (c.type === "COMPLETE" && (old?.movement ?? 0) < 3)
          throw new DirectionError(
            "Reach the closing beat or explicitly skip the finale.",
          );
        const completed =
          c.type === "COMPLETE"
            ? 4
            : Math.max(
                old?.completedMovements ?? 0,
                c.type === "ADVANCE" ? movement : 0,
              );
        const released = ["DEFER", "SKIP", "COMPLETE"].includes(c.type);
        const data = {
          disposition,
          movement,
          completedMovements: completed,
          editionId,
          leaseToken: released ? null : c.clientId,
          leaseUntil: released ? null : new Date(at.getTime() + 60000),
        };
        if (old)
          await tx.seasonTransition.update({
            where: { id: old.id },
            data: {
              ...data,
              ...(c.type === "RENEW" ? {} : { version: { increment: 1 } }),
            },
          });
        else
          await tx.seasonTransition.create({
            data: { userId, fromStartOn: storedDate(c.startOn), ...data },
          });
        if (c.type !== "RENEW")
          await tx.reviewMutation.create({
            data: {
              userId,
              operationKey: c.operationKey,
              fingerprint: hash,
              result: jsonValue({ startOn: c.startOn }),
            },
          });
      },
      { isolationLevel: "Serializable", timeout: 30000 },
    ),
  );
  return {
    error: null,
    transition: await getSeasonTransition(
      userId,
      {
        startOn: c.startOn,
        clientId: c.clientId,
        replay: false,
        includeReview: !["DEFER", "SKIP", "RENEW"].includes(c.type),
      },
      at,
    ),
  };
}
