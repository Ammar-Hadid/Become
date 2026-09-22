import type { Prisma } from "@/generated/prisma/client";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import {
  explorationClaimCorrectionSchema,
  explorationClaimSchema,
  explorationUncertaintyCorrectionSchema,
  explorationUncertaintySchema,
  publishExplorationSnapshotSchema,
} from "@/features/entrepreneurship/exploration-snapshots/schemas/exploration-snapshot.schema";
import { readExplorationSnapshotFacts } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import type { z } from "zod";

type ClaimInput = z.output<typeof explorationClaimSchema>;

async function requireActiveExploration(
  tx: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
) {
  const niche = await tx.niche.findFirst({
    where: { id: nicheId, userId, archivedAt: null },
    select: { id: true },
  });
  if (!niche) throw new BusinessError("Choose an active exploration you own.");
}

async function validatedCitations(
  tx: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  citations: ClaimInput["citations"],
) {
  const unique = new Set(citations.map((item) => item.observationId));
  if (unique.size !== citations.length)
    throw new BusinessError(
      "Add each observation only once to a claim revision.",
    );
  if (!citations.length) return [];
  const observations = await tx.observation.findMany({
    where: {
      id: { in: citations.map((item) => item.observationId) },
      userId,
      voidedAt: null,
    },
    include: {
      revisions: {
        where: {
          id: { in: citations.map((item) => item.observationRevisionId) },
        },
      },
    },
  });
  return citations.map((citation) => {
    const observation = observations.find(
      (candidate) => candidate.id === citation.observationId,
    );
    const revision = observation?.revisions.find(
      (candidate) => candidate.id === citation.observationRevisionId,
    );
    if (
      !observation ||
      !revision ||
      observation.version !== revision.version ||
      revision.nicheId !== nicheId
    )
      throw new BusinessError(
        "Claims may cite only the current version of an observation in this exploration.",
      );
    return {
      observationId: observation.id,
      observationRevisionId: revision.id,
      stance: citation.stance,
      note: citation.note,
    };
  });
}

export async function createExplorationClaim(
  userId: string,
  key: string,
  input: unknown,
) {
  const data = explorationClaimSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await requireActiveExploration(tx, userId, data.nicheId);
    const citations = await validatedCitations(
      tx,
      userId,
      data.nicheId,
      data.citations,
    );
    const claim = await tx.explorationClaim.create({
      data: { userId, nicheId: data.nicheId },
    });
    await tx.explorationClaimRevision.create({
      data: {
        userId,
        nicheId: data.nicheId,
        claimId: claim.id,
        version: 1,
        lane: data.lane,
        kind: data.kind,
        statement: data.statement,
        citations: { create: citations },
      },
    });
    return claim.id;
  });
}

export async function correctExplorationClaim(
  userId: string,
  claimId: string,
  key: string,
  input: unknown,
) {
  const data = explorationClaimCorrectionSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const claim = await tx.explorationClaim.findFirst({
      where: { id: claimId, userId, archivedAt: null },
    });
    if (!claim || claim.version !== data.expectedVersion)
      throw new BusinessError(
        "This claim changed. Review its latest version before correcting it.",
      );
    if (claim.nicheId !== data.nicheId)
      throw new BusinessError("A claim cannot move between explorations.");
    await requireActiveExploration(tx, userId, claim.nicheId);
    const citations = await validatedCitations(
      tx,
      userId,
      data.nicheId,
      data.citations,
    );
    await tx.explorationClaimRevision.create({
      data: {
        userId,
        nicheId: data.nicheId,
        claimId,
        version: claim.version + 1,
        lane: data.lane,
        kind: data.kind,
        statement: data.statement,
        correctionReason: data.correctionReason,
        citations: { create: citations },
      },
    });
    await tx.explorationClaim.update({
      where: { id_userId: { id: claimId, userId } },
      data: { version: { increment: 1 } },
    });
    return claimId;
  });
}

export async function archiveExplorationClaim(
  userId: string,
  claimId: string,
  key: string,
) {
  return captureOnce(userId, key, { claimId }, async (tx) => {
    const claim = await tx.explorationClaim.findFirst({
      where: { id: claimId, userId, archivedAt: null },
    });
    if (!claim) throw new BusinessError("Choose an active claim you own.");
    await requireActiveExploration(tx, userId, claim.nicheId);
    await tx.explorationClaim.update({
      where: { id_userId: { id: claimId, userId } },
      data: { archivedAt: new Date() },
    });
    return claimId;
  });
}

export async function createExplorationUncertainty(
  userId: string,
  key: string,
  input: unknown,
) {
  const data = explorationUncertaintySchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await requireActiveExploration(tx, userId, data.nicheId);
    const uncertainty = await tx.explorationUncertainty.create({
      data: { userId, nicheId: data.nicheId },
    });
    await tx.explorationUncertaintyRevision.create({
      data: {
        userId,
        nicheId: data.nicheId,
        uncertaintyId: uncertainty.id,
        version: 1,
        lane: data.lane,
        statement: data.statement,
      },
    });
    return uncertainty.id;
  });
}

export async function correctExplorationUncertainty(
  userId: string,
  uncertaintyId: string,
  key: string,
  input: unknown,
) {
  const data = explorationUncertaintyCorrectionSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const uncertainty = await tx.explorationUncertainty.findFirst({
      where: { id: uncertaintyId, userId, archivedAt: null },
    });
    if (!uncertainty || uncertainty.version !== data.expectedVersion)
      throw new BusinessError(
        "This uncertainty changed. Review its latest version before correcting it.",
      );
    if (uncertainty.nicheId !== data.nicheId)
      throw new BusinessError(
        "An uncertainty cannot move between explorations.",
      );
    await requireActiveExploration(tx, userId, uncertainty.nicheId);
    await tx.explorationUncertaintyRevision.create({
      data: {
        userId,
        nicheId: data.nicheId,
        uncertaintyId,
        version: uncertainty.version + 1,
        lane: data.lane,
        statement: data.statement,
        correctionReason: data.correctionReason,
      },
    });
    await tx.explorationUncertainty.update({
      where: { id_userId: { id: uncertaintyId, userId } },
      data: { version: { increment: 1 } },
    });
    return uncertaintyId;
  });
}

export async function resolveExplorationUncertainty(
  userId: string,
  uncertaintyId: string,
  key: string,
) {
  return captureOnce(userId, key, { uncertaintyId }, async (tx) => {
    const uncertainty = await tx.explorationUncertainty.findFirst({
      where: {
        id: uncertaintyId,
        userId,
        archivedAt: null,
        resolvedAt: null,
      },
    });
    if (!uncertainty)
      throw new BusinessError("Choose an unresolved question you own.");
    await requireActiveExploration(tx, userId, uncertainty.nicheId);
    await tx.explorationUncertainty.update({
      where: { id_userId: { id: uncertaintyId, userId } },
      data: { resolvedAt: new Date() },
    });
    return uncertaintyId;
  });
}

export async function publishExplorationSnapshot(
  userId: string,
  key: string,
  input: unknown,
) {
  const data = publishExplorationSnapshotSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await requireActiveExploration(tx, userId, data.nicheId);
    const claimIds = [...new Set(data.claimIds)];
    const uncertaintyIds = [...new Set(data.uncertaintyIds)];
    const [claims, uncertainties, facts, previous] = await Promise.all([
      tx.explorationClaim.findMany({
        where: {
          id: { in: claimIds },
          userId,
          nicheId: data.nicheId,
          archivedAt: null,
        },
        include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
      }),
      tx.explorationUncertainty.findMany({
        where: {
          id: { in: uncertaintyIds },
          userId,
          nicheId: data.nicheId,
          archivedAt: null,
          resolvedAt: null,
        },
        include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
      }),
      readExplorationSnapshotFacts(tx, userId, data.nicheId),
      tx.explorationSnapshotEdition.findFirst({
        where: { userId, nicheId: data.nicheId },
        orderBy: [{ number: "desc" }, { id: "desc" }],
        select: { number: true },
      }),
    ]);
    if (claims.length !== claimIds.length)
      throw new BusinessError("Choose active claims from this exploration.");
    if (uncertainties.length !== uncertaintyIds.length)
      throw new BusinessError(
        "Choose unresolved questions from this exploration.",
      );
    if (!facts) throw new BusinessError("Choose an exploration you own.");
    const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
    const uncertaintiesById = new Map(
      uncertainties.map((uncertainty) => [uncertainty.id, uncertainty]),
    );
    const orderedClaims = claimIds.map((id) => claimsById.get(id)!);
    const orderedUncertainties = uncertaintyIds.map((id) =>
      uncertaintiesById.get(id)!,
    );
    if (
      orderedClaims.some((claim) => !claim.revisions[0]) ||
      orderedUncertainties.some((uncertainty) => !uncertainty.revisions[0])
    )
      throw new BusinessError(
        "One selected item has no readable revision. Review the living record before publishing.",
      );
    const edition = await tx.explorationSnapshotEdition.create({
      data: {
        userId,
        nicheId: data.nicheId,
        number: (previous?.number ?? 0) + 1,
        coverage: facts.coverage,
        recommendation: facts.recommendation,
        sourceCursor: {
          latestMaterialAt: facts.latestMaterialAt?.toISOString() ?? null,
          claimRevisionIds: orderedClaims.map((claim) => claim.revisions[0].id),
          uncertaintyRevisionIds: orderedUncertainties.map(
            (uncertainty) => uncertainty.revisions[0].id,
          ),
        },
        claims: {
          create: orderedClaims.map((claim, position) => ({
            claimId: claim.id,
            claimRevisionId: claim.revisions[0].id,
            position,
          })),
        },
        uncertainties: {
          create: orderedUncertainties.map((uncertainty, position) => ({
            uncertaintyId: uncertainty.id,
            uncertaintyRevisionId: uncertainty.revisions[0].id,
            position,
          })),
        },
      },
    });
    return edition.id;
  });
}
