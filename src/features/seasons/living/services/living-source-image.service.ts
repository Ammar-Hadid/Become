import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  normalizeSeasonImage,
  MAX_UPLOAD_BYTES,
} from "@/features/seasons/media/services/season-image.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { getCharacterWithImages } from "@/features/seasons/discovery/services/character-lookup.service";
import { trustedCharacterImage } from "@/features/seasons/discovery/services/character-catalogue-images.service";
import { requiredSeason, ensureLivingPack } from "./living-season-pack.service";
import { preserveLivingSnapshot } from "./living-snapshot.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";

const locator = z.object({
  year: z.number().int().min(2020).max(2200),
  quarter: z.number().int().min(1).max(4),
});
export async function uploadLivingSourceImage(
  userId: string,
  input: unknown,
  bytes: Buffer,
  provenance = "UPLOAD",
  expectedIdentity?: { id: string; revision: number },
) {
  const data = locator
    .extend({
      label: z.string().trim().min(1).max(200),
      sourceUrl: z.url().max(2000).optional(),
    })
    .parse(input);
  const { identity } = await requiredSeason(userId, data.year, data.quarter);
  if (
    expectedIdentity &&
    (identity.row.id !== expectedIdentity.id ||
      identity.row.revision !== expectedIdentity.revision)
  )
    throw new DirectionError(
      "The chosen character changed during import. Retry with the current identity.",
    );
  const pack = await ensureLivingPack(userId, data.year, data.quarter);
  const normalized = await normalizeSeasonImage(bytes);
  const storageKey = `media/character-references/${pack.id}/${randomUUID()}.webp`;
  await getMediaStorage().put(storageKey, normalized.bytes);
  try {
    return await prisma.$transaction(async (tx) => {
      const season = await lockSeason(tx, userId, data.year, data.quarter);
      const current =
        season && !season.closedAt
          ? await getCotsIdentity(userId, season.id, tx)
          : null;
      if (
        !current ||
        current.row.id !== identity.row.id ||
        current.row.revision !== identity.row.revision
      )
        throw new DirectionError(
          "The chosen character changed during upload. Retry with the current identity.",
        );
      return tx.livingSeasonSourceImage.create({
        data: {
          userId,
          packId: pack.id,
          identityId: identity.row.id,
          adaptation: identity.view.adaptation,
          label: data.label,
          sourceUrl: data.sourceUrl,
          provenance,
          storageKey,
          width: normalized.width,
          height: normalized.height,
        },
      });
    });
  } catch (error) {
    await getMediaStorage()
      .remove(storageKey)
      .catch(() => {});
    throw error;
  }
}

export async function reviewLivingSourceImage(
  userId: string,
  input: unknown,
  retire = false,
) {
  const data = locator
    .extend({
      imageId: z.string().min(1),
      characterLikenessConfirmed: retire
        ? z.boolean().optional()
        : z.literal(true),
    })
    .parse(input);
  const { identity } = await requiredSeason(userId, data.year, data.quarter);
  const pack = await ensureLivingPack(userId, data.year, data.quarter);
  await preserveLivingSnapshot(pack.id);
  return prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, data.year, data.quarter);
    if (!season || season.closedAt)
      throw new DirectionError(
        "Reopen an editable Season before reviewing references.",
      );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-source:${pack.id}`},0))::text`;
    const currentIdentity = await tx.seasonCotsIdentity.findFirst({
      where: {
        id: identity.row.id,
        active: true,
        revision: identity.row.revision,
      },
    });
    if (!currentIdentity)
      throw new DirectionError(
        "The selected character changed. Reopen References.",
      );
    const image = await tx.livingSeasonSourceImage.findFirst({
      where: {
        id: data.imageId,
        userId,
        packId: pack.id,
        identityId: identity.row.id,
        adaptation: identity.view.adaptation,
        retiredAt: null,
      },
    });
    if (!image)
      throw new DirectionError(
        "Choose a current reference belonging to this character and adaptation.",
      );
    if (!retire && image.approvedAt) return image;
    if (
      !retire &&
      (await tx.livingSeasonSourceImage.count({
        where: {
          packId: pack.id,
          identityId: identity.row.id,
          adaptation: identity.view.adaptation,
          approvedAt: { not: null },
          retiredAt: null,
        },
      })) >= 2
    )
      throw new DirectionError(
        "Keep two primary character references. Retire one before confirming a replacement.",
      );
    const saved = await tx.livingSeasonSourceImage.update({
      where: { id: image.id },
      data: retire ? { retiredAt: new Date() } : { approvedAt: new Date() },
    });
    if (image.approvedAt || !retire)
      await tx.livingSeasonPack.update({
        where: { id: pack.id },
        data: { briefRevision: { increment: 1 }, activeAt: null },
      });
    return saved;
  });
}

export async function importCharacterReference(userId: string, input: unknown) {
  const data = locator
    .extend({ candidateId: z.string(), workId: z.number().int() })
    .parse(input);
  const candidate = await getCharacterWithImages(data.candidateId);
  const { identity } = await requiredSeason(userId, data.year, data.quarter);
  const work = candidate.works.find((w) => w.id === data.workId);
  if (
    !work ||
    identity.view.sourceEntityId !== candidate.id ||
    identity.view.sourceWork !== work.title ||
    identity.view.adaptation !== work.adaptation
  )
    throw new DirectionError(
      "Confirm the retrieved character and adaptation before importing references.",
    );
  if (!candidate.images.length)
    throw new DirectionError(
      "This record has no reference image. Upload an authentic character image.",
    );
  const saved = [];
  for (const [index, image] of candidate.images.slice(0, 4).entries()) {
    if (!trustedCharacterImage(image.href)) continue;
    const label = `${candidate.name} · ${image.sourceLabel} ${index + 1}`;
    const existing = await prisma.livingSeasonSourceImage.findFirst({
      where: {
        userId,
        identityId: identity.row.id,
        label,
        sourceUrl: image.sourceUrl,
        retiredAt: null,
        pack: { seasonId: identity.row.seasonId },
      },
    });
    if (existing) {
      saved.push(existing);
      continue;
    }
    const response = await fetch(image.href, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    )
      throw new DirectionError(
        "The catalogue image is unavailable. Upload a reference instead.",
      );
    const reader = response.body?.getReader();
    if (!reader) throw new DirectionError("The catalogue returned no image.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value.length;
        if (total > MAX_UPLOAD_BYTES) {
          await reader.cancel();
          throw new DirectionError("The reference image is too large.");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    saved.push(
      await uploadLivingSourceImage(
        userId,
        { ...data, label, sourceUrl: image.sourceUrl },
        Buffer.concat(chunks),
        "CATALOGUE",
        { id: identity.row.id, revision: identity.row.revision },
      ),
    );
  }
  return saved;
}
