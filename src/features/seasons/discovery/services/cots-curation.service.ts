import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  jsonValue,
  requireVersion,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { cotsSelectionCommand } from "@/features/seasons/discovery/schemas/cots-discovery.schema";
import {
  getCotsCollection,
  getCotsIdentity,
} from "@/features/seasons/discovery/queries/cots-collection.query";
import { cotsLimits } from "@/features/seasons/discovery/config/cots-provider.config";
import { seasonPreviewKey } from "@/features/seasons/media/services/season-image-preview.service";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";

export async function selectCotsCandidate(userId: string, input: unknown) {
  const c = cotsSelectionCommand.parse(input);
  const discardedStorageKey = await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError("This season is not editable.");
    const active = await getCotsIdentity(userId, season.id, tx);
    if (!active) throw new DirectionError("Confirm your inspiration first.");
    const existing = await tx.seasonCotsSelection.findUnique({
      where: {
        userId_identityId_candidateId: {
          userId,
          identityId: active.row.id,
          candidateId: c.candidateRef,
        },
      },
    });
    if (c.selected && existing) return;
    if (!c.selected && !existing) return;
    requireVersion(active.row.selectionRevision, c.expectedSelectionRevision);
    if (!c.selected) {
      if (!existing || !["SELECTED", "FAILED"].includes(existing.status))
        throw new DirectionError(
          "This item is already confirmed. Use collection retirement after it finishes.",
        );
      await tx.seasonCotsSelection.delete({ where: { id: existing.id } });
    } else {
      const candidate = await tx.seasonCotsCandidate.findFirst({
        where: {
          id: c.candidateRef,
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          contextId: active.view.discoveryContextId!,
          expiresAt: { gt: new Date() },
        },
      });
      if (!candidate)
        throw new DirectionError(
          "This candidate expired or belongs to a previous search. Find it again.",
          undefined,
          409,
        );
      const snapshot = candidate.snapshot as unknown as ProviderCandidate;
      if (!snapshot.importable || snapshot.form === "SOURCE_LINK")
        throw new DirectionError(
          "Open this source for review; it does not contain an extracted candidate to keep.",
        );
      if (
        (await tx.seasonCotsSelection.count({
          where: { userId, identityId: active.row.id },
        })) >=
        cotsLimits().images + cotsLimits().quotes + 100
      )
        throw new DirectionError(
          "Review your existing collection before selecting more candidates.",
        );
      await tx.seasonCotsSelection.create({
        data: {
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          contextId: candidate.contextId,
          candidateId: candidate.id,
          snapshot: candidate.snapshot as object,
        },
      });
    }
    await tx.seasonCotsIdentity.update({
      where: { id: active.row.id },
      data: { selectionRevision: { increment: 1 } },
    });
    return existing?.status === "FAILED" ? existing.storageKey : null;
  });
  if (discardedStorageKey) {
    const storage = getMediaStorage();
    await Promise.allSettled([
      storage.remove(discardedStorageKey),
      storage.remove(seasonPreviewKey(discardedStorageKey)),
    ]);
  }
  return getCotsCollection(userId, c.year, c.quarter);
}

export function discoveredProvenance(
  snapshot: ProviderCandidate,
  contextId: string,
) {
  return {
    version: 2,
    origin: "DISCOVERY",
    sourceUrl: snapshot.sourceUrl,
    sourceTitle: snapshot.sourceWork || snapshot.title,
    credit: snapshot.credit,
    provider: snapshot.provider,
    externalId: snapshot.externalId,
    selectedAt: new Date().toISOString(),
    attributionVerified: false,
    evidence: snapshot.evidence,
    form: snapshot.form,
    language: snapshot.language,
    sourceDetail: snapshot.sourceDetail,
    contextId,
    sourceCategory: (
      snapshot as ProviderCandidate & { sourceCategory?: string }
    ).sourceCategory,
    license: snapshot.license,
  };
}
export async function confirmCotsSelection(userId: string, input: unknown) {
  const c = seasonIdentitySchema
    .extend({
      expectedSelectionRevision: z.number().int(),
      desiredPosterSelectionId: z.string().max(100).optional(),
      desiredQuoteSelectionId: z.string().max(100).optional(),
    })
    .parse(input);
  await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError("This season is not editable.");
    const active = await getCotsIdentity(userId, season.id, tx);
    if (!active) throw new DirectionError("Confirm your inspiration first.");
    const selections = await tx.seasonCotsSelection.findMany({
      where: { userId, identityId: active.row.id },
    });
    const selected = selections.filter((v) => v.status === "SELECTED");
    const chosenQuote = c.desiredQuoteSelectionId
      ? selections.find(
          (v) =>
            v.id === c.desiredQuoteSelectionId &&
            !["IMAGE", "SOURCE_LINK"].includes(
              (v.snapshot as unknown as ProviderCandidate).form,
            ),
        )
      : null;
    if (c.desiredQuoteSelectionId && !chosenQuote)
      throw new DirectionError(
        "Choose featured words from your selected text.",
      );
    const quoteAlreadyFeatured = chosenQuote?.quoteId
      ? await tx.seasonQuote.findFirst({
          where: {
            id: chosenQuote.quoteId,
            userId,
            seasonId: season.id,
            identityId: active.row.id,
            retiredAt: null,
            featured: true,
          },
        })
      : null;
    // Repeating an already committed batch must not duplicate text or re-feature a deferred poster.
    if (
      !selected.length &&
      (!c.desiredQuoteSelectionId || quoteAlreadyFeatured) &&
      (!c.desiredPosterSelectionId ||
        selections.some(
          (v) => v.id === c.desiredPosterSelectionId && v.desiredPoster,
        ))
    )
      return;
    requireVersion(active.row.selectionRevision, c.expectedSelectionRevision);
    const images = selected.filter(
      (v) => (v.snapshot as unknown as ProviderCandidate).form === "IMAGE",
    );
    const texts = selected.filter(
      (v) => (v.snapshot as unknown as ProviderCandidate).form !== "IMAGE",
    );
    const inFlight = selections.filter((v) =>
      ["PENDING", "IMPORTING"].includes(v.status),
    ).length;
    const imageCount = await tx.seasonMediaUse.count({
      where: {
        userId,
        seasonId: season.id,
        identityId: active.row.id,
        retiredAt: null,
      },
    });
    const quoteCount = await tx.seasonQuote.count({
      where: {
        userId,
        seasonId: season.id,
        identityId: active.row.id,
        retiredAt: null,
      },
    });
    if (
      imageCount + inFlight + images.length > cotsLimits().images ||
      quoteCount + texts.length > cotsLimits().quotes
    )
      throw new DirectionError(
        "This batch exceeds the saved collection capacity. Retire items or keep a smaller selection.",
      );
    if (
      c.desiredPosterSelectionId &&
      !selections.some(
        (v) =>
          v.id === c.desiredPosterSelectionId &&
          (v.snapshot as unknown as ProviderCandidate).form === "IMAGE",
      )
    )
      throw new DirectionError("Choose a poster from your selected images.");
    if (c.desiredPosterSelectionId) {
      await tx.seasonCotsSelection.updateMany({
        where: { userId, identityId: active.row.id },
        data: { desiredPoster: false },
      });
      await tx.seasonCotsSelection.update({
        where: { id: c.desiredPosterSelectionId },
        data: { desiredPoster: true },
      });
      const ready = selections.find(
        (v) => v.id === c.desiredPosterSelectionId && v.status === "READY",
      );
      if (ready?.mediaId) {
        await tx.seasonMediaUse.updateMany({
          where: { userId, seasonId: season.id },
          data: { poster: false },
        });
        await tx.seasonMediaUse.updateMany({
          where: {
            userId,
            seasonId: season.id,
            identityId: active.row.id,
            mediaId: ready.mediaId,
            retiredAt: null,
          },
          data: { poster: true },
        });
      }
    }
    for (const item of images)
      await tx.seasonCotsSelection.update({
        where: { id: item.id },
        data: { status: "PENDING", error: null },
      });
    for (const item of texts) {
      const snapshot = item.snapshot as unknown as ProviderCandidate;
      if (!snapshot.text || snapshot.form === "SOURCE_LINK")
        throw new DirectionError("This item has no extracted wording.");
      const quote = await tx.seasonQuote.create({
        data: {
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          text: snapshot.text,
          attribution: snapshot.speaker || "",
          kind: "EXACT",
          featured: false,
          rotation: true,
          provenance: jsonValue(discoveredProvenance(snapshot, item.contextId)),
        },
      });
      await tx.seasonCotsSelection.update({
        where: { id: item.id },
        data: { status: "READY", quoteId: quote.id },
      });
    }
    if (chosenQuote) {
      const ready = await tx.seasonCotsSelection.findUniqueOrThrow({
        where: { id: chosenQuote.id },
      });
      const quote = await tx.seasonQuote.findFirst({
        where: {
          id: ready.quoteId ?? "",
          userId,
          seasonId: season.id,
          identityId: active.row.id,
          retiredAt: null,
        },
      });
      if (!quote)
        throw new DirectionError(
          "Those words are no longer available to feature.",
        );
      await tx.seasonQuote.updateMany({
        where: { userId, seasonId: season.id },
        data: { featured: false },
      });
      await tx.seasonQuote.update({
        where: { id: quote.id },
        data: { featured: true },
      });
    }
    await tx.seasonCotsIdentity.update({
      where: { id: active.row.id },
      data: { selectionRevision: { increment: 1 } },
    });
  });
  return getCotsCollection(userId, c.year, c.quarter);
}

export async function cotsPreflight(userId: string, input: unknown) {
  const c = seasonIdentitySchema
    .extend({ beginWithCurrentPoster: z.boolean().optional() })
    .parse(input);
  await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season) return;
    if (c.beginWithCurrentPoster)
      await tx.seasonCotsSelection.updateMany({
        where: {
          userId,
          seasonId: season.id,
          status: { in: ["SELECTED", "PENDING", "IMPORTING", "FAILED"] },
        },
        data: { desiredPoster: false },
      });
  });
  const collection = await getCotsCollection(userId, c.year, c.quarter);
  const season = await prisma.userSeason.findUnique({
    where: {
      userId_year_quarter: { userId, year: c.year, quarter: c.quarter },
    },
  });
  const where = {
    userId,
    seasonId: season?.id ?? "",
    identityId: collection.identity?.id ?? null,
    retiredAt: null,
  };
  const [poster, quote] = await Promise.all([
    prisma.seasonMediaUse.findFirst({ where: { ...where, poster: true } }),
    prisma.seasonQuote.findFirst({ where: { ...where, featured: true } }),
  ]);
  return {
    collection,
    readyPosterId: poster?.mediaId ?? null,
    readyQuoteId: quote?.id ?? null,
    pendingCount: collection.selections.filter((v) =>
      ["PENDING", "IMPORTING"].includes(v.status),
    ).length,
    failedCount: collection.selections.filter((v) => v.status === "FAILED")
      .length,
  };
}
