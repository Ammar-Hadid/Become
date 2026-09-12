import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { cotsCategory } from "@/features/seasons/discovery/constants/cots-category.constants";
import { cotsLimits } from "@/features/seasons/discovery/config/cots-provider.config";
import type {
  CotsCandidateView,
  CotsCollectionView,
  CotsIdentityView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import type {
  SeasonCotsContext,
  SeasonCotsIdentity,
} from "@/generated/prisma/client";

export function identityView(
  identity: SeasonCotsIdentity,
  context?: SeasonCotsContext | null,
): CotsIdentityView {
  return {
    id: identity.id,
    identityRevision: identity.revision,
    displayName: identity.displayName,
    subjectKind:
      identity.subjectKind === "PERSON"
        ? "PERSON"
        : identity.subjectKind === "FICTIONAL"
          ? "FICTIONAL"
          : "UNKNOWN",
    sourceCategory: cotsCategory(context?.category)?.value ?? null,
    registryVersion: context?.registryVersion ?? 1,
    discoveryContextId: context?.id ?? null,
    discoveryRevision: context?.revision ?? 0,
    sourceWork: context?.sourceWork ?? "",
    adaptation: context?.adaptation ?? "",
    language: context?.language ?? "en",
    savedAt: identity.savedAt.toISOString(),
    sourceEntityId: context?.sourceEntityId ?? null,
  };
}
export function candidateView(
  snapshot: ProviderCandidate,
  id: string,
): CotsCandidateView {
  // The client never receives the download URL or credentials. Preview is authenticated and candidate-bound.
  const { originalUrl, previewUrl, imageQuality, popularityRank, ...view } =
    snapshot;
  void originalUrl;
  void imageQuality;
  void popularityRank;
  return {
    ...view,
    candidateRef: id,
    previewHref: previewUrl ? `/api/direction/cots/preview/${id}` : null,
  };
}
export async function getCotsIdentity(
  userId: string,
  seasonId: string,
  tx: DirectionTx = prisma,
) {
  const identity = await tx.seasonCotsIdentity.findFirst({
    where: { userId, seasonId, active: true },
    include: { contexts: { orderBy: { revision: "desc" }, take: 1 } },
  });
  if (!identity) return null;
  const view = identityView(identity, identity.contexts[0]);
  if (!identity.contexts.length) {
    const season = await tx.userSeason.findUnique({
      where: { id: seasonId },
      select: { character: true },
    });
    const legacy = season?.character as
      { sourceWork?: string; adaptation?: string } | undefined;
    view.sourceWork = legacy?.sourceWork ?? "";
    view.adaptation = legacy?.adaptation ?? "";
  }
  return { row: identity, view };
}
export async function getCotsCollection(
  userId: string,
  year: number,
  quarter: number,
  tx: DirectionTx = prisma,
): Promise<CotsCollectionView> {
  const season = await tx.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
  });
  const active = season ? await getCotsIdentity(userId, season.id, tx) : null;
  const rows = active
    ? await tx.seasonCotsSelection.findMany({
        where: { userId, seasonId: season!.id, identityId: active.row.id },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const selections = rows.map((row): CotsSelectionView => {
    const snapshot = row.snapshot as unknown as ProviderCandidate & {
      sourceCategory?: string;
      adaptation?: string;
    };
    return {
      id: row.id,
      candidateRef: row.candidateId,
      candidate: candidateView(snapshot, row.candidateId),
      identityId: row.identityId,
      sourceCategory: cotsCategory(snapshot.sourceCategory)?.value ?? null,
      sourceWork: snapshot.sourceWork,
      adaptation: snapshot.adaptation ?? "",
      status: row.status as CotsSelectionView["status"],
      desiredPoster: row.desiredPoster,
      mediaId: row.mediaId,
      quoteId: row.quoteId,
      error: row.error,
    };
  });
  return {
    identity: active?.view ?? null,
    selectionRevision: active?.row.selectionRevision ?? 0,
    selections,
    limits: cotsLimits(),
  };
}
