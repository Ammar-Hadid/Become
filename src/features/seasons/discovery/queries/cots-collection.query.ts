import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { cotsCategory } from "@/features/seasons/discovery/constants/cots-category.constants";
import type {
  CotsCollectionView,
  CotsIdentityView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
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
  return {
    identity: active?.view ?? null,
    selectionRevision: active?.row.selectionRevision ?? 0,
  };
}
