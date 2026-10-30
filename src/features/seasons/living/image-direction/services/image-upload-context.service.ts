import "server-only";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  DirectionError,
  requireVersion,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { imagePromptCoreFingerprint } from "./image-prompt-writing.service";
import type { ImagePromptPackage } from "../utils/image-prompt-package.util";

/** Revalidate after decoding/storage and before admitting any manual/provider result. */
export async function validateImageUploadContext(
  tx: DirectionTx,
  userId: string,
  year: number,
  quarter: number,
  prompt: ImagePromptPackage,
  expectedRevision?: number,
) {
  const season = await lockSeason(tx, userId, year, quarter);
  if (!season || season.closedAt)
    throw new DirectionError("This Season is closed.");
  const identity = await getCotsIdentity(userId, season.id, tx);
  const pack = await tx.livingSeasonPack.findUniqueOrThrow({
    where: { seasonId: season.id },
    include: {
      profiles: { orderBy: { version: "desc" }, take: 1 },
      visualIntents: { orderBy: { version: "desc" }, take: 1 },
      sourceImages: {
        where: { approvedAt: { not: null }, retiredAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      onboarding: true,
    },
  });
  if (
    !identity ||
    pack.identityId !== identity.row.id ||
    prompt.identityId !== identity.row.id ||
    pack.briefRevision !== prompt.briefRevision ||
    pack.profiles[0]?.version !== prompt.profileVersion ||
    pack.visualIntents[0]?.version !== prompt.intentVersion ||
    !pack.profiles[0]?.approvedAt ||
    !pack.visualIntents[0]?.approvedAt
  )
    throw new DirectionError(
      "The character or world changed during upload. Review the current draft and retry.",
      undefined,
      409,
    );
  const originals = pack.sourceImages
    .filter(
      (image) =>
        image.identityId === identity.row.id &&
        image.adaptation === identity.view.adaptation,
    )
    .slice(0, 2);
  const sourceFingerprint = imagePromptCoreFingerprint({
    identityId: identity.row.id,
    identityRevision: identity.row.revision,
    profileVersion: pack.profiles[0].version,
    intentVersion: pack.visualIntents[0].version,
    briefRevision: pack.briefRevision,
    originals: originals.map((image) => ({
      id: image.id,
      storageKey: image.storageKey,
    })),
  });
  if (
    prompt.sourceFingerprint &&
    prompt.sourceFingerprint !== sourceFingerprint
  )
    throw new DirectionError(
      "The reviewed character references changed during this operation. Retry with the current prompt.",
      undefined,
      409,
    );
  if (expectedRevision !== undefined) {
    if (!pack.onboarding)
      throw new DirectionError("Open the current onboarding first.");
    requireVersion(pack.onboarding.revision, expectedRevision);
    if (
      pack.onboarding.status !== "WAITING" ||
      (pack.onboarding.leaseToken &&
        pack.onboarding.leaseUntil &&
        pack.onboarding.leaseUntil > new Date())
    )
      throw new DirectionError(
        "The current task is still finishing. Upload again shortly.",
      );
  }
  return { pack, sourceFingerprint };
}
