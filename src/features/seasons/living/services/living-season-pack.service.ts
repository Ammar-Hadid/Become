import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { normalizeSeasonImage } from "@/features/seasons/media/services/season-image.service";
import {
  livingArtworkSlotSchema,
  livingCharacterProfileSchema,
} from "@/features/seasons/living/schemas/living-season.schema";
import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import { resolveSeasonImagePackage } from "@/features/seasons/living/image-direction/services/image-prompt-package.service";
import type { ImagePromptPackage } from "@/features/seasons/living/image-direction/utils/image-prompt-package.util";
import { visualBriefFingerprint } from "@/features/seasons/living/image-direction/utils/visual-intent.util";
import { currentArtwork } from "@/features/seasons/living/utils/living-pack.util";
import {
  assertSceneAttempt,
  purgeUnusedSceneAttempts,
  processLivingMediaCleanup,
} from "../onboarding/scene-attempt.service";
import { validateImageUploadContext } from "../image-direction/services/image-upload-context.service";
import { fingerprint } from "@/features/direction/services/direction-mutation.service";
import {
  documentToText,
  validateTextDocument,
} from "@/components/ui/document-editor/utils/document-editor-text.util";
import {
  latestLivingBanner,
  livingBannerReady,
} from "@/features/seasons/living/schemas/living-character-banner.schema";

import { preserveLivingSnapshot } from "./living-snapshot.service";
import { lockSeason } from "@/features/seasons/services/season.service";
const identitySchema = z.object({
  year: z.number().int().min(2020).max(2200),
  quarter: z.number().int().min(1).max(4),
});
const setupSchema = identitySchema.extend({
  setting: z.string().trim().min(3).max(600),
  visualBrief: z.string().trim().min(3).max(2000),
});
const referencePromptSchema = identitySchema.extend({
  document: z.unknown(),
  expectedBriefRevision: z.number().int().positive(),
});

export async function requiredSeason(
  userId: string,
  year: number,
  quarter: number,
) {
  const season = await prisma.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
  });
  if (!season)
    throw new DirectionError(
      "Save this Season before building its artwork pack.",
    );
  if (season.closedAt)
    throw new DirectionError(
      "A closed Season cannot change its Living Season pack.",
    );
  const identity = await getCotsIdentity(userId, season.id);
  if (!identity)
    throw new DirectionError("Choose a Character of the Season first.");
  return { season, identity };
}

export async function ensureLivingPack(
  userId: string,
  year: number,
  quarter: number,
) {
  const { season, identity } = await requiredSeason(userId, year, quarter);
  const pack = await prisma.livingSeasonPack.upsert({
    where: { seasonId: season.id },
    create: { userId, seasonId: season.id, identityId: identity.row.id },
    update: {},
  });
  if (pack.identityId === identity.row.id) return pack;
  await preserveLivingSnapshot(pack.id);
  return prisma.livingSeasonPack.update({
    where: { id: pack.id },
    data: {
      identityId: identity.row.id,
      setting: "",
      visualBrief: "",
      briefRevision: { increment: 1 },
      activeAt: null,
    },
  });
}

export async function saveLivingSeasonSetup(userId: string, input: unknown) {
  const data = setupSchema.parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const existing = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
  });
  if (!existing)
    return prisma.livingSeasonPack.create({
      data: {
        userId,
        seasonId: season.id,
        identityId: identity.row.id,
        setting: data.setting,
        visualBrief: data.visualBrief,
      },
    });
  if (
    existing.identityId === identity.row.id &&
    existing.setting === data.setting &&
    existing.visualBrief === data.visualBrief
  )
    return existing;
  await preserveLivingSnapshot(existing.id);
  return prisma.livingSeasonPack.update({
    where: { id: existing.id },
    data: {
      identityId: identity.row.id,
      setting: data.setting,
      visualBrief: data.visualBrief,
      referencePromptOverride: null,
      referencePromptDocument: Prisma.DbNull,
      briefRevision: { increment: 1 },
      activeAt: null,
    },
  });
}

export async function saveLivingReferencePrompt(
  userId: string,
  input: unknown,
) {
  const data = referencePromptSchema.parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
  });
  if (!pack || pack.identityId !== identity.row.id)
    throw new DirectionError("Save the current setting first.");
  if (pack.briefRevision !== data.expectedBriefRevision)
    throw new DirectionError(
      "The character or setting changed. Reopen the latest prompt before saving.",
    );
  const profileRow = await prisma.livingSeasonProfile.findFirst({
    where: { packId: pack.id, identityId: identity.row.id },
    orderBy: { version: "desc" },
  });
  if (!profileRow)
    throw new DirectionError(
      "Save the character profile before editing its reference prompt.",
    );
  livingCharacterProfileSchema.parse(profileRow.content);
  const document = validateTextDocument(data.document);
  const prompt = documentToText(document).trim();
  if (prompt.length < 20 || prompt.length > 12000)
    throw new DirectionError(
      "Keep the reference prompt between 20 and 12,000 characters.",
    );
  const generated = (
    await resolveSeasonImagePackage(userId, data.year, data.quarter, {
      variant: "reference-sheet",
      ignoreReferenceOverride: true,
    })
  ).prompt;
  const override = prompt === generated ? null : prompt;
  const documentValue = jsonValue(document);
  if (
    pack.referencePromptOverride === override &&
    JSON.stringify(pack.referencePromptDocument) ===
      JSON.stringify(documentValue)
  )
    return pack;
  const textChanged = pack.referencePromptOverride !== override;
  const saved = await prisma.livingSeasonPack.updateMany({
    where: { id: pack.id, briefRevision: data.expectedBriefRevision },
    data: textChanged
      ? {
          referencePromptOverride: override,
          referencePromptDocument: documentValue,
          ...(pack.activeAt
            ? {}
            : { briefRevision: { increment: 1 }, activeAt: null }),
        }
      : { referencePromptDocument: documentValue },
  });
  if (!saved.count)
    throw new DirectionError(
      "The character or setting changed. Reopen the latest prompt before saving.",
    );
  return prisma.livingSeasonPack.findUniqueOrThrow({ where: { id: pack.id } });
}

export async function saveLivingCharacterProfile(
  userId: string,
  input: unknown,
) {
  const data = identitySchema
    .extend({
      profile: livingCharacterProfileSchema,
      expectedProfileVersion: z.number().int().min(0).optional(),
    })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await ensureLivingPack(userId, data.year, data.quarter);
  if (!pack || pack.identityId !== identity.row.id)
    throw new DirectionError("Save the current setting first.");
  if (
    data.profile.characterName !== identity.view.displayName ||
    data.profile.sourceWork !== identity.view.sourceWork ||
    data.profile.adaptation !== identity.view.adaptation
  )
    throw new DirectionError(
      "The profile must match the selected character and source work.",
    );
  await preserveLivingSnapshot(pack.id);
  return prisma.$transaction(async (tx) => {
    await lockSeason(tx, userId, data.year, data.quarter);
    const currentIdentity = await getCotsIdentity(userId, season.id, tx);
    if (
      currentIdentity?.row.id !== identity.row.id ||
      currentIdentity.row.revision !== identity.row.revision
    )
      throw new DirectionError(
        "The character changed while saving. Reopen its profile.",
      );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-profile:${pack.id}`},0))::text`;
    const latest = await tx.livingSeasonProfile.findFirst({
      where: { packId: pack.id },
      orderBy: { version: "desc" },
    });
    if (
      data.expectedProfileVersion !== undefined &&
      (latest?.version ?? 0) !== data.expectedProfileVersion
    )
      throw new DirectionError(
        "The saved profile changed while drafting. Review the latest version first.",
      );
    if (
      latest &&
      JSON.stringify(latest.content) === JSON.stringify(data.profile)
    )
      return latest;
    await tx.livingSeasonPack.update({
      where: { id: pack.id },
      data: {
        referencePromptOverride: null,
        referencePromptDocument: Prisma.DbNull,
        briefRevision: { increment: 1 },
        activeAt: null,
      },
    });
    return tx.livingSeasonProfile.create({
      data: {
        userId,
        packId: pack.id,
        identityId: identity.row.id,
        version: (latest?.version ?? 0) + 1,
        content: jsonValue(data.profile),
      },
    });
  });
}

export async function approveLivingCharacterProfile(
  userId: string,
  input: unknown,
) {
  const data = identitySchema
    .extend({ profileId: z.string().min(1) })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const profile = await prisma.livingSeasonProfile.findFirst({
    where: {
      id: data.profileId,
      userId,
      pack: { seasonId: season.id, identityId: identity.row.id },
    },
  });
  if (!profile)
    throw new DirectionError(
      "This profile does not belong to the selected character.",
    );
  livingCharacterProfileSchema.parse(profile.content);
  const latest = await prisma.livingSeasonProfile.findFirst({
    where: { packId: profile.packId },
    orderBy: { version: "desc" },
  });
  if (latest?.id !== profile.id)
    throw new DirectionError("Review the newest profile revision.");
  return prisma.livingSeasonProfile.update({
    where: { id: profile.id },
    data: { approvedAt: new Date() },
  });
}

export async function uploadLivingReference(
  userId: string,
  input: unknown,
  bytes: Buffer,
  generatedPackage?: ImagePromptPackage,
) {
  const data = identitySchema
    .extend({ promptReceipt: z.string().length(64).optional() })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
  });
  if (!pack || pack.identityId !== identity.row.id)
    throw new DirectionError("Save the current setting first.");
  const profileRow = await prisma.livingSeasonProfile.findFirst({
    where: { packId: pack.id },
    orderBy: { version: "desc" },
  });
  if (!profileRow)
    throw new DirectionError(
      "Save the character profile before adding a reference sheet.",
    );
  livingCharacterProfileSchema.parse(profileRow.content);
  const promptPackage =
    generatedPackage ??
    (await resolveSeasonImagePackage(userId, data.year, data.quarter, {
      variant: "reference-sheet",
    }));
  if (data.promptReceipt && data.promptReceipt !== promptPackage.receipt)
    throw new DirectionError(
      "The copied prompt receipt is outdated. Copy the current prompt before uploading.",
    );
  const normalized = await normalizeSeasonImage(bytes);
  if (normalized.width / normalized.height < 1.2)
    throw new DirectionError(
      "Choose a wide reference sheet with a clear character identity.",
    );
  const storageKey = `media/seasons/${season.id}/${randomUUID()}.webp`;
  const storage = getMediaStorage();
  await storage.put(storageKey, normalized.bytes);
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-reference:${pack.id}`},0))::text`;
      const latest = await tx.livingSeasonReference.findFirst({
        where: { packId: pack.id },
        orderBy: { revision: "desc" },
      });
      return tx.livingSeasonReference.create({
        data: {
          userId,
          packId: pack.id,
          identityId: identity.row.id,
          briefRevision: pack.briefRevision,
          profileVersion: profileRow.version,
          revision: (latest?.revision ?? 0) + 1,
          prompt: promptPackage.prompt,
          promptPackage: jsonValue(promptPackage),
          manualPromptReceipt: generatedPackage
            ? null
            : (data.promptReceipt ?? null),
          storageKey,
          width: normalized.width,
          height: normalized.height,
        },
      });
    });
  } catch (error) {
    const saved = await prisma.livingSeasonReference
      .findFirst({ where: { storageKey }, select: { id: true } })
      .catch(() => null);
    if (!saved)
      try {
        await storage.remove(storageKey);
      } catch {
        /* Preserve the original error. */
      }
    throw error;
  }
}

export async function approveLivingReference(userId: string, input: unknown) {
  const data = identitySchema
    .extend({
      referenceId: z.string().min(1),
      characterLikenessConfirmed: z.literal(true),
    })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const reference = await prisma.livingSeasonReference.findFirst({
    where: {
      id: data.referenceId,
      userId,
      pack: { seasonId: season.id, identityId: identity.row.id },
    },
  });
  if (!reference)
    throw new DirectionError("Reference sheet not found in this Season.");
  const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
    where: { id: reference.packId },
  });
  const latest = await prisma.livingSeasonReference.findFirst({
    where: { packId: pack.id },
    orderBy: { revision: "desc" },
  });
  const latestProfile = await prisma.livingSeasonProfile.findFirst({
    where: { packId: pack.id },
    orderBy: { version: "desc" },
  });
  if (!latestProfile?.approvedAt)
    throw new DirectionError(
      "Approve the latest character profile before approving its reference sheet.",
    );
  if (
    latest?.id !== reference.id ||
    reference.briefRevision !== pack.briefRevision ||
    reference.profileVersion !== latestProfile?.version
  )
    throw new DirectionError(
      "Review a reference sheet based on the latest profile and visual brief.",
    );
  return prisma.livingSeasonReference.update({
    where: { id: reference.id },
    data: { approvedAt: new Date() },
  });
}

export async function uploadLivingArtwork(
  userId: string,
  input: unknown,
  bytes: Buffer,
  generatedPackage?: ImagePromptPackage,
) {
  const data = identitySchema
    .extend({
      slot: livingArtworkSlotSchema,
      promptReceipt: z.string().length(64).optional(),
      promptBatchId: z.string().optional(),
      sceneAttemptId: z.string().optional(),
      expectedRevision: z.number().int().nonnegative().optional(),
      operationKey: z.uuid().optional(),
    })
    .parse(input);
  const uploadFingerprint = fingerprint({
    year: data.year,
    quarter: data.quarter,
    slot: data.slot,
    promptReceipt: data.promptReceipt,
    sceneAttemptId: data.sceneAttemptId,
    bytesHash: fingerprint(bytes.toString("base64")),
  });
  if (data.operationKey) {
    const previous = await prisma.livingSeasonArtwork.findUnique({
      where: {
        userId_uploadOperationKey: {
          userId,
          uploadOperationKey: data.operationKey,
        },
      },
    });
    if (previous) {
      if (previous.uploadFingerprint !== uploadFingerprint)
        throw new DirectionError(
          "This upload operation belongs to another file or composition.",
          undefined,
          409,
        );
      return previous;
    }
  }
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: { references: { orderBy: { revision: "desc" }, take: 1 } },
  });
  if (!pack || pack.identityId !== identity.row.id)
    throw new DirectionError("Save the current setting first.");
  if (
    pack.referenceMode === "SHEET" &&
    (!pack.references[0]?.approvedAt ||
      pack.references[0].briefRevision !== pack.briefRevision)
  )
    throw new DirectionError(
      "Approve the current character and setting reference sheet before adding scene artwork.",
    );
  const profileRow = await prisma.livingSeasonProfile.findFirst({
    where: { packId: pack.id, identityId: identity.row.id },
    orderBy: { version: "desc" },
  });
  if (!profileRow)
    throw new DirectionError(
      "Save a character profile before making its artwork.",
    );
  livingCharacterProfileSchema.parse(profileRow.content);
  const promptPackage =
    generatedPackage ??
    (await resolveSeasonImagePackage(userId, data.year, data.quarter, {
      variant: "scene-neutral-desktop",
      slot: data.slot,
      allowTemplateOnly: !data.promptReceipt,
      receipt: data.promptReceipt,
      batchId: data.promptBatchId,
    }));
  if (data.promptReceipt && data.promptReceipt !== promptPackage.receipt)
    throw new DirectionError(
      "The copied prompt receipt is outdated. Copy the current prompt before uploading.",
    );
  const normalized = await normalizeSeasonImage(bytes);
  const ratio = normalized.width / normalized.height;
  if (data.slot.format === "MOBILE" ? ratio > 0.85 : ratio < 1.4)
    throw new DirectionError(
      data.slot.format === "MOBILE"
        ? "Choose a portrait phone composition."
        : "Choose a wide desktop composition.",
    );
  const storageKey = `media/seasons/${season.id}/${randomUUID()}.webp`;
  const storage = getMediaStorage();
  await storage.put(storageKey, normalized.bytes);
  try {
    const saved = await prisma.$transaction(async (tx) => {
      await lockSeason(tx, userId, data.year, data.quarter);
      if (data.operationKey) {
        const previous = await tx.livingSeasonArtwork.findUnique({
          where: {
            userId_uploadOperationKey: {
              userId,
              uploadOperationKey: data.operationKey,
            },
          },
        });
        if (previous) {
          if (previous.uploadFingerprint !== uploadFingerprint)
            throw new DirectionError(
              "This upload operation belongs to another file.",
              undefined,
              409,
            );
          return previous;
        }
      }
      const current = await validateImageUploadContext(
        tx,
        userId,
        data.year,
        data.quarter,
        promptPackage,
        generatedPackage ? undefined : data.expectedRevision,
      );
      const attempt = await assertSceneAttempt(tx, {
        userId,
        packId: pack.id,
        activeId: current.pack.activeSceneAttemptId,
        requestedId: data.sceneAttemptId ?? pack.activeSceneAttemptId,
        method: generatedPackage ? "AI" : "MANUAL",
        sourceFingerprint: current.sourceFingerprint,
        allowKept: Boolean(generatedPackage),
        required: current.pack.imagePromptMode === "AI_AUTHORED",
      });
      if (
        !generatedPackage &&
        current.pack.imagePromptMode === "AI_AUTHORED" &&
        (!["SCENE_PREPARATION", "SCENES"].includes(
          current.pack.onboarding?.stage ?? "",
        ) ||
          current.pack.onboarding?.status !== "WAITING")
      )
        throw new DirectionError(
          "Open manual chapter preparation before uploading scenes.",
        );
      if (attempt && data.slot.chapter > 1) {
        const previousArt = await tx.livingSeasonArtwork.findMany({
          where: {
            packId: pack.id,
            sceneAttemptId: attempt.id,
            chapter: data.slot.chapter - 1,
          },
        });
        const reviewed = currentArtwork(
          previousArt,
          identity.row.id,
          pack.briefRevision,
          attempt.id,
        );
        if (
          livingArtworkSlots
            .filter((slot) => slot.chapter === data.slot.chapter - 1)
            .some(
              (slot) =>
                !reviewed.latest.get(
                  `${slot.chapter}:${slot.state}:${slot.format}`,
                )?.approvedAt,
            )
        )
          throw new DirectionError(
            "Approve the preceding chapter before adding later scenes.",
          );
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-art:${pack.id}`},0))::text`;
      const latest = await tx.livingSeasonArtwork.findFirst({
        where: {
          packId: pack.id,
          chapter: data.slot.chapter,
          state: data.slot.state,
          format: data.slot.format,
        },
        orderBy: { revision: "desc" },
      });
      // A new image is a draft; the existing approved scene remains active until this revision is approved.
      const artifact = await tx.livingSeasonArtwork.create({
        data: {
          userId,
          packId: pack.id,
          identityId: identity.row.id,
          briefRevision: pack.briefRevision,
          ...data.slot,
          sceneAttemptId: attempt?.id ?? null,
          uploadOperationKey: data.operationKey,
          uploadFingerprint: data.operationKey ? uploadFingerprint : null,
          revision: (latest?.revision ?? 0) + 1,
          storageKey,
          prompt: promptPackage.prompt,
          promptPackage: jsonValue(promptPackage),
          manualPromptReceipt: generatedPackage
            ? null
            : (data.promptReceipt ?? null),
          width: normalized.width,
          height: normalized.height,
        },
      });
      if (!generatedPackage && current.pack.onboarding) {
        await tx.seasonOnboardingRun.update({
          where: { id: current.pack.onboarding.id },
          data: {
            stage: "SCENE_PREPARATION",
            status: "WAITING",
            revision: { increment: 1 },
            chapter: data.slot.chapter,
          },
        });
        if (attempt)
          await tx.livingSceneAttempt.update({
            where: { id: attempt.id },
            data: { chapter: data.slot.chapter },
          });
        await tx.livingSeasonArtwork.updateMany({
          where: {
            packId: pack.id,
            sceneAttemptId: attempt?.id ?? null,
            chapter: { gt: data.slot.chapter },
          },
          data: { approvedAt: null },
        });
      }
      return artifact;
    });
    if (saved.storageKey !== storageKey) {
      try {
        await storage.remove(storageKey);
      } catch {
        await prisma.livingMediaCleanup.createMany({
          data: [{ userId, packId: pack.id, storageKey }],
          skipDuplicates: true,
        });
      }
    }
    return saved;
  } catch (error) {
    const saved = await prisma.livingSeasonArtwork
      .findFirst({ where: { storageKey }, select: { id: true } })
      .catch(() => null);
    if (!saved)
      try {
        await storage.remove(storageKey);
      } catch {
        /* Preserve the original transaction error. */
      }
    throw error;
  }
}

export async function approveLivingArtwork(userId: string, input: unknown) {
  const data = identitySchema
    .extend({
      artworkId: z.string().min(1),
      characterLikenessConfirmed: z.literal(true),
      mobileCharacterVisible: z.boolean().optional(),
    })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const artwork = await prisma.livingSeasonArtwork.findFirst({
    where: {
      id: data.artworkId,
      userId,
      pack: { seasonId: season.id, identityId: identity.row.id },
    },
  });
  if (!artwork) throw new DirectionError("Artwork not found in this Season.");
  if (artwork.format === "MOBILE" && data.mobileCharacterVisible !== true)
    throw new DirectionError(
      "Confirm the character is clearly visible in the phone preview before approval.",
    );
  const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
    where: { id: artwork.packId },
  });
  if (
    pack.imagePromptMode === "AI_AUTHORED" &&
    (!pack.activeSceneAttemptId ||
      artwork.sceneAttemptId !== pack.activeSceneAttemptId)
  )
    throw new DirectionError("Review artwork from the selected scene attempt.");
  if (artwork.briefRevision !== pack.briefRevision)
    throw new DirectionError(
      "This artwork belongs to an earlier visual brief.",
    );
  const latest = await prisma.livingSeasonArtwork.findFirst({
    where: {
      packId: artwork.packId,
      sceneAttemptId: pack.activeSceneAttemptId,
      chapter: artwork.chapter,
      state: artwork.state,
      format: artwork.format,
    },
    orderBy: { revision: "desc" },
  });
  if (latest?.id !== artwork.id)
    throw new DirectionError("Review the newest artwork revision.");
  await preserveLivingSnapshot(pack.id);
  return prisma.livingSeasonArtwork.update({
    where: { id: artwork.id },
    data: { approvedAt: new Date() },
  });
}

export async function updateLivingArtworkFocal(userId: string, input: unknown) {
  const data = identitySchema
    .extend({
      artworkId: z.string().min(1),
      focalX: z.number().min(0).max(1),
      focalY: z.number().min(0).max(1),
    })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const artwork = await prisma.livingSeasonArtwork.findFirst({
    where: {
      id: data.artworkId,
      userId,
      pack: { seasonId: season.id, identityId: identity.row.id },
    },
  });
  if (!artwork) throw new DirectionError("Artwork not found in this Season.");
  const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
    where: { id: artwork.packId },
  });
  if (
    pack.imagePromptMode === "AI_AUTHORED" &&
    (!pack.activeSceneAttemptId ||
      artwork.sceneAttemptId !== pack.activeSceneAttemptId)
  )
    throw new DirectionError("Review artwork from the selected scene attempt.");
  if (artwork.briefRevision !== pack.briefRevision)
    throw new DirectionError("Adjust an image from the current visual brief.");
  const latest = await prisma.livingSeasonArtwork.findFirst({
    where: {
      packId: artwork.packId,
      sceneAttemptId: pack.activeSceneAttemptId,
      chapter: artwork.chapter,
      state: artwork.state,
      format: artwork.format,
    },
    orderBy: { revision: "desc" },
  });
  if (latest?.id !== artwork.id)
    throw new DirectionError("Adjust the newest artwork revision.");
  await preserveLivingSnapshot(pack.id);
  return prisma.$transaction(async (tx) => {
    await tx.livingSeasonPack.update({
      where: { id: artwork.packId },
      data: { activeAt: null },
    });
    return tx.livingSeasonArtwork.update({
      where: { id: artwork.id },
      data: { focalX: data.focalX, focalY: data.focalY, approvedAt: null },
    });
  });
}

export async function activateLivingSeasonPack(userId: string, input: unknown) {
  const data = identitySchema.parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: {
      profiles: { orderBy: { version: "desc" } },
      visualIntents: { orderBy: { version: "desc" }, take: 1 },
      references: { orderBy: { revision: "desc" }, take: 1 },
      sourceImages: { where: { approvedAt: { not: null }, retiredAt: null } },
      artwork: true,
    },
  });
  if (!pack || pack.identityId !== identity.row.id)
    throw new DirectionError("Build a pack for the selected character first.");
  if (
    !pack.sourceImages.some(
      (image) =>
        image.identityId === identity.row.id &&
        image.adaptation === identity.view.adaptation,
    )
  )
    throw new DirectionError(
      "Confirm an authentic source image for this character and adaptation first.",
    );
  const profile = pack.profiles.find(
    (item) => item.identityId === identity.row.id,
  );
  if (!profile?.approvedAt)
    throw new DirectionError("Approve the latest character profile first.");
  const intent = pack.visualIntents[0];
  if (
    !intent?.approvedAt ||
    intent.identityId !== identity.row.id ||
    intent.profileVersion !== profile.version ||
    intent.briefFingerprint !==
      visualBriefFingerprint(
        identity.row.id,
        profile.version,
        pack.setting,
        pack.visualBrief,
      )
  )
    throw new DirectionError(
      "Approve the current visual-intent brief before activation.",
    );
  if (
    !livingBannerReady(
      latestLivingBanner(pack.characterBanner),
      identity.row.id,
      profile.version,
      pack.briefRevision,
    )
  )
    throw new DirectionError(
      "Approve the current desktop and phone character banners, profile portrait, and banner copy before activation.",
    );
  if (
    pack.referenceMode === "SHEET" &&
    (!pack.references[0]?.approvedAt ||
      pack.references[0].identityId !== identity.row.id ||
      pack.references[0].briefRevision !== pack.briefRevision ||
      pack.references[0].profileVersion !== profile.version)
  )
    throw new DirectionError(
      "Approve the latest character reference sheet first.",
    );
  const art = currentArtwork(
    pack.artwork,
    identity.row.id,
    pack.briefRevision,
    pack.activeSceneAttemptId,
  );
  if (art.missingForActivation.length)
    throw new DirectionError(
      `Approve every desktop and phone composition first (${42 - art.missingForActivation.length}/42 ready).`,
    );
  if (art.latest.size !== livingArtworkSlots.length)
    throw new DirectionError("This artwork pack is incomplete.");
  const activated = await prisma.$transaction(
    async (tx) => {
      const locked = await lockSeason(tx, userId, data.year, data.quarter);
      if (!locked || locked.closedAt)
        throw new DirectionError("This Season is closed.");
      const currentIdentity = await getCotsIdentity(userId, season.id, tx);
      const fresh = await tx.livingSeasonPack.findUniqueOrThrow({
        where: { id: pack.id },
        include: {
          artwork: true,
          profiles: { orderBy: { version: "desc" }, take: 1 },
          visualIntents: { orderBy: { version: "desc" }, take: 1 },
        },
      });
      if (
        currentIdentity?.row.id !== identity.row.id ||
        currentIdentity.row.revision !== identity.row.revision ||
        fresh.briefRevision !== pack.briefRevision ||
        fresh.activeSceneAttemptId !== pack.activeSceneAttemptId ||
        fresh.profiles[0]?.version !== profile.version ||
        !fresh.profiles[0]?.approvedAt ||
        fresh.visualIntents[0]?.version !== intent.version ||
        !fresh.visualIntents[0]?.approvedAt ||
        !livingBannerReady(
          latestLivingBanner(fresh.characterBanner),
          identity.row.id,
          profile.version,
          pack.briefRevision,
        ) ||
        currentArtwork(
          fresh.artwork,
          identity.row.id,
          fresh.briefRevision,
          fresh.activeSceneAttemptId,
        ).missingForActivation.length
      )
        throw new DirectionError(
          "This Season changed during activation. Review the current pack first.",
          undefined,
          409,
        );
      await tx.livingSeasonPack.update({
        where: { id: pack.id },
        data: { activeAt: new Date() },
      });
      await preserveLivingSnapshot(pack.id, true, tx);
      const saved = await tx.livingSeasonPack.findUniqueOrThrow({
        where: { id: pack.id },
      });
      await purgeUnusedSceneAttempts(
        tx,
        userId,
        pack.id,
        saved.activeSceneAttemptId,
        saved.activeSnapshot,
      );
      return saved;
    },
    { timeout: 15000 },
  );
  await processLivingMediaCleanup();
  return activated;
}
