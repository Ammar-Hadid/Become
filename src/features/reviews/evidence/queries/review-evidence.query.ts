import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { z } from "zod";
import {
  DirectionError,
  storedDate,
} from "@/features/direction/services/direction-mutation.service";
import { reviewIdentitySchema } from "@/features/reviews/contracts/schemas/review.schema";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import {
  readReviewAggregates,
  reviewSourcesSql,
  reviewSource,
  decodeEvidenceCursor,
  evidenceCursor,
  type SourceRow,
} from "@/features/reviews/facts/queries/review-sources.query";
import { readReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { measurePacket } from "@/features/reviews/facts/utils/review-payload.util";
import type {
  ReviewEvidencePage,
  ReviewSource,
  PeriodReviewFacts,
} from "@/features/reviews/contracts/types/review.types";
export const evidenceRequestSchema = reviewIdentitySchema.extend({
  metricKey: z.string().min(1).max(200),
  fingerprint: z.string().length(64),
  editionId: z.string().max(200).optional(),
  cursor: z.string().max(1500).optional(),
});
export async function getReviewEvidence(
  userId: string,
  input: unknown,
  at = new Date(),
): Promise<ReviewEvidencePage> {
  const c = evidenceRequestSchema.parse(input),
    identity = { timeframe: c.timeframe, startOn: c.startOn };
  let cursor: ReturnType<typeof decodeEvidenceCursor>;
  try {
    cursor = decodeEvidenceCursor(c.cursor);
  } catch {
    throw new DirectionError("This evidence page cursor is invalid.");
  }
  return prisma.$transaction(
    async (tx) => {
      let period = reviewPeriod(c.timeframe, c.startOn, at);
      let items: ReviewSource[],
        total: number,
        referenceTime = at.toISOString();
      if (c.editionId) {
        const edition = await tx.reviewEdition.findFirst({
          where: {
            id: c.editionId,
            userId,
            review: { timeframe: c.timeframe, startOn: storedDate(c.startOn) },
          },
        });
        if (!edition)
          throw new DirectionError("Review edition not found.", undefined, 404);
        if (edition.factsFingerprint !== c.fingerprint)
          throw new DirectionError(
            "Choose the evidence from this edition.",
            undefined,
            409,
          );
        referenceTime = edition.capturedAt.toISOString();
        period = (edition.facts as unknown as PeriodReviewFacts).period;
        const where = { userId, editionId: edition.id, metricKey: c.metricKey };
        const [count, rows] = await Promise.all([
          tx.reviewEditionSource.count({ where }),
          tx.reviewEditionSource.findMany({
            where: {
              ...where,
              ...(cursor
                ? {
                    OR: [
                      { occurredAt: { lt: cursor.at } },
                      { occurredAt: cursor.at, key: { lt: cursor.key } },
                    ],
                  }
                : {}),
            },
            orderBy: [{ occurredAt: "desc" }, { key: "desc" }],
            take: 26,
          }),
        ]);
        total = count;
        items = rows.map((r) => r.snapshot as unknown as ReviewSource);
      } else {
        const draft = await tx.review.findUnique({
          where: {
            userId_timeframe_startOn: {
              userId,
              timeframe: c.timeframe,
              startOn: storedDate(c.startOn),
            },
          },
        });
        const selected =
          (draft?.writing as { selectedMomentKeys?: string[] } | undefined)
            ?.selectedMomentKeys ?? [];
        const facts = await readReviewFacts(
          tx,
          userId,
          identity,
          at,
          undefined,
          selected,
        );
        if (facts.fingerprint !== c.fingerprint)
          throw new DirectionError(
            "The live evidence changed. Refresh the review before continuing through its sources.",
            undefined,
            409,
          );
        const scope = {
          userId,
          start: new Date(period.start),
          end: new Date(period.evaluatedThrough),
          at,
        };
        const totals = await readReviewAggregates(tx, scope);
        total = totals.find((m) => m.metricKey === c.metricKey)?.count ?? 0;
        const rows = await tx.$queryRaw<SourceRow[]>(
          Prisma.sql`WITH sources AS (${reviewSourcesSql(scope)}) SELECT * FROM sources WHERE "metricKey"=${c.metricKey} ${cursor ? Prisma.sql`AND ("occurredAt",key)<(${cursor.at},${cursor.key})` : Prisma.empty} ORDER BY "occurredAt" DESC,key DESC LIMIT 26`,
        );
        items = rows.map(reviewSource);
      }
      const page: ReviewEvidencePage = {
        schemaVersion: 1,
        metricVersion: 1,
        period,
        referenceTime,
        fingerprint: c.fingerprint,
        editionId: c.editionId ?? null,
        total,
        items: items.slice(0, 25),
        nextCursor: items.length > 25 ? evidenceCursor(items[24]) : null,
        warnings: [
          c.editionId
            ? "Captured evidence references preserve their saved wording. Canonical links open the current owned source, which may have changed."
            : "Sources explain the complete qualified total; this page is a bounded sample.",
        ],
        payloadBytes: 0,
      };
      measurePacket(page);
      while (page.payloadBytes > 64 * 1024 && page.items.length > 1) {
        page.items.pop();
        page.nextCursor = evidenceCursor(page.items.at(-1)!);
        measurePacket(page);
      }
      if (page.payloadBytes > 64 * 1024)
        throw Error("Evidence page exceeds its payload budget");
      return page;
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
