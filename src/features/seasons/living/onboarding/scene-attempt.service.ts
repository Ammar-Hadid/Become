import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { livingActiveSnapshotSchema } from "../services/living-snapshot.service";
import { currentArtwork, slotKey } from "../utils/living-pack.util";
import { livingArtworkSlots } from "../utils/living-artwork-prompt.util";

export async function discardSceneAttempt(
  tx: DirectionTx,
  userId: string,
  packId: string,
  attemptId: string,
  activeSnapshot: unknown,
) {
  await tx.livingSceneAttempt.updateMany({
    where: { id: attemptId, userId, packId },
    data: { status: "DISCARDED" },
  });
  const snapshot = livingActiveSnapshotSchema.safeParse(activeSnapshot);
  const protectedIds = snapshot.success
    ? [
        ...snapshot.data.activatedArtworkIds,
        ...snapshot.data.artwork.map((art) => art.id),
      ]
    : [];
  const unused = await tx.livingSeasonArtwork.findMany({
    where: {
      userId,
      packId,
      sceneAttemptId: attemptId,
      id: { notIn: protectedIds },
    },
    select: { id: true, storageKey: true },
  });
  if (unused.length) {
    await tx.livingMediaCleanup.createMany({
      data: unused.map((art) => ({
        userId,
        packId,
        storageKey: art.storageKey,
      })),
      skipDuplicates: true,
    });
    await tx.livingSeasonArtwork.deleteMany({
      where: { userId, id: { in: unused.map((art) => art.id) } },
    });
  }
}
export async function chooseSceneAttempt(
  tx: DirectionTx,
  input: {
    userId: string;
    packId: string;
    currentId: string | null;
    method: "AI" | "MANUAL";
    sourceFingerprint: string;
    retention: "KEEP" | "DELETE";
    activeSnapshot: unknown;
  },
) {
  if (input.currentId) {
    const current = await tx.livingSceneAttempt.findFirst({
      where: {
        id: input.currentId,
        userId: input.userId,
        packId: input.packId,
      },
    });
    if (
      current?.method === input.method &&
      current.sourceFingerprint === input.sourceFingerprint &&
      current.status === "ACTIVE"
    )
      return current;
    if (input.retention === "DELETE")
      await discardSceneAttempt(
        tx,
        input.userId,
        input.packId,
        input.currentId,
        input.activeSnapshot,
      );
    else
      await tx.livingSceneAttempt.updateMany({
        where: {
          id: input.currentId,
          userId: input.userId,
          packId: input.packId,
        },
        data: { status: "KEPT" },
      });
  }
  const kept = await tx.livingSceneAttempt.findFirst({
    where: {
      userId: input.userId,
      packId: input.packId,
      method: input.method,
      status: "KEPT",
      sourceFingerprint: input.sourceFingerprint,
    },
    orderBy: { updatedAt: "desc" },
  });
  const selected = kept
    ? await tx.livingSceneAttempt.update({
        where: { id: kept.id },
        data: { status: "ACTIVE" },
      })
    : await tx.livingSceneAttempt.create({
        data: {
          userId: input.userId,
          packId: input.packId,
          method: input.method,
          sourceFingerprint: input.sourceFingerprint,
        },
      });
  await tx.livingSeasonPack.update({
    where: { id: input.packId },
    data: { activeSceneAttemptId: selected.id },
  });
  return selected;
}
export function firstUnreviewedChapter(
  rows: Parameters<typeof currentArtwork>[0],
  identityId: string,
  briefRevision: number,
  attemptId: string,
) {
  const art = currentArtwork(rows, identityId, briefRevision, attemptId);
  return Math.min(...art.missingForActivation.map((slot) => slot.chapter), 7);
}
export async function assertSceneAttempt(
  tx: DirectionTx,
  input: {
    userId: string;
    packId: string;
    activeId: string | null;
    requestedId?: string | null;
    method: "AI" | "MANUAL";
    sourceFingerprint: string;
    allowKept?: boolean;
    required?: boolean;
  },
) {
  const id = input.requestedId ?? input.activeId;
  if (!id) {
    if (input.required)
      throw new DirectionError(
        "Choose how to create all seven chapters first.",
      );
    return null;
  }
  const attempt = await tx.livingSceneAttempt.findFirst({
    where: {
      id,
      userId: input.userId,
      packId: input.packId,
      status: { in: input.allowKept ? ["ACTIVE", "KEPT"] : ["ACTIVE"] },
    },
  });
  if (
    !attempt ||
    attempt.method !== input.method ||
    attempt.sourceFingerprint !== input.sourceFingerprint ||
    (!input.allowKept && input.activeId !== id)
  )
    throw new DirectionError(
      "This image belongs to a different creation method or source revision. Open the current scene attempt first.",
      undefined,
      409,
    );
  return attempt;
}
export async function purgeUnusedSceneAttempts(
  tx: DirectionTx,
  userId: string,
  packId: string,
  selectedId: string | null,
  activeSnapshot: unknown,
) {
  const unused = await tx.livingSceneAttempt.findMany({
    where: {
      userId,
      packId,
      id: selectedId ? { not: selectedId } : undefined,
      status: { not: "DISCARDED" },
    },
  });
  for (const attempt of unused)
    await discardSceneAttempt(tx, userId, packId, attempt.id, activeSnapshot);
}

/** Filesystem cleanup is durable, retried, and never blocks successful activation. */
export async function processLivingMediaCleanup() {
  const jobs = await prisma.livingMediaCleanup.findMany({
    where: { availableAt: { lte: new Date() } },
    take: 10,
    orderBy: { createdAt: "asc" },
  });
  for (const job of jobs) {
    try {
      // A referenced asset can never be removed by a retry or an old cleanup job.
      if (
        await prisma.livingSeasonArtwork.count({
          where: { storageKey: job.storageKey },
        })
      ) {
        await prisma.livingMediaCleanup.deleteMany({ where: { id: job.id } });
        continue;
      }
      await getMediaStorage().remove(job.storageKey);
      await prisma.livingMediaCleanup.deleteMany({ where: { id: job.id } });
    } catch (cause) {
      await prisma.livingMediaCleanup.updateMany({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          error:
            cause instanceof Error ? cause.message : "Media cleanup failed.",
          availableAt: new Date(Date.now() + 30000),
        },
      });
    }
  }
  return jobs.length > 0;
}

export function missingChapterSlots(
  rows: Parameters<typeof currentArtwork>[0],
  identityId: string,
  briefRevision: number,
  attemptId: string,
  chapter: number,
) {
  const art = currentArtwork(rows, identityId, briefRevision, attemptId);
  return livingArtworkSlots.filter(
    (slot) => slot.chapter === chapter && !art.latest.has(slotKey(slot)),
  );
}
