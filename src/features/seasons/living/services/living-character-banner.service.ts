import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  DirectionError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { livingCharacterProfileSchema } from "@/features/seasons/living/schemas/living-season.schema";
import {
  livingBannerKindSchema,
  livingBannerLedgerSchema,
  latestLivingBanner,
  livingBannerReady,
  type LivingBannerRevision,
} from "@/features/seasons/living/schemas/living-character-banner.schema";
import { normalizeSeasonImage } from "@/features/seasons/media/services/season-image.service";
import { resolveSeasonImagePackage } from "../image-direction/services/image-prompt-package.service";
import type { ImagePromptPackage } from "../image-direction/utils/image-prompt-package.util";
import { lockSeason } from "@/features/seasons/services/season.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { requiredSeason } from "./living-season-pack.service";
import { validateImageUploadContext } from "../image-direction/services/image-upload-context.service";
import {
  fingerprint,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";

const locator = z.object({
  year: z.number().int().min(2020).max(2200),
  quarter: z.number().int().min(1).max(4),
});
const assetRequest = locator.extend({
  bannerKind: livingBannerKindSchema,
  promptReceipt: z.string().length(64).optional(),
  promptBatchId: z.string().optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  operationKey: z.uuid().optional(),
});
const copyRequest = locator.extend({
  quote: z.string().trim().max(240),
  attribution: z.string().trim().max(120),
  quoteSource: z.string().trim().max(500),
  rightLine: z.string().trim().max(100),
});
const cropRequest = locator.extend({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  zoom: z.number().min(1).max(2),
});

async function lockCurrentBannerSeason(
  tx: DirectionTx,
  userId: string,
  year: number,
  quarter: number,
  expectedIdentity: { id: string; revision: number },
) {
  const season = await lockSeason(tx, userId, year, quarter);
  if (!season || season.closedAt)
    throw new DirectionError(
      "A closed Season cannot change its character banner.",
    );
  const identity = await getCotsIdentity(userId, season.id, tx);
  if (
    identity?.row.id !== expectedIdentity.id ||
    identity.row.revision !== expectedIdentity.revision
  )
    throw new DirectionError(
      "The character changed. Review the current banner before saving.",
      undefined,
      409,
    );
}

async function mutateBanner(
  userId: string,
  year: number,
  quarter: number,
  edit: (draft: LivingBannerRevision) => LivingBannerRevision,
  guard?: (tx: DirectionTx) => Promise<LivingBannerRevision | void>,
) {
  const { season, identity } = await requiredSeason(userId, year, quarter);
  return prisma.$transaction(async (tx) => {
    await lockCurrentBannerSeason(tx, userId, year, quarter, identity.row);
    if (guard) {
      const duplicate = await guard(tx);
      if (duplicate) return duplicate;
    }
    const pack = await tx.livingSeasonPack.findUnique({
      where: { seasonId: season.id },
    });
    if (!pack || pack.identityId !== identity.row.id)
      throw new DirectionError(
        "Save the Season setting before editing its character banner.",
      );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-banner:${pack.id}`},0))::text`;
    const current = await tx.livingSeasonPack.findUniqueOrThrow({
      where: { id: pack.id },
    });
    const profileRow = await tx.livingSeasonProfile.findFirst({
      where: { packId: pack.id, identityId: identity.row.id },
      orderBy: { version: "desc" },
    });
    if (!profileRow)
      throw new DirectionError(
        "Save the character profile before preparing its banner.",
      );
    const ledger = livingBannerLedgerSchema.safeParse(current.characterBanner);
    const revisions = ledger.success ? ledger.data.revisions : [];
    const latest = revisions.at(-1);
    const base: LivingBannerRevision =
      latest &&
      latest.identityId === identity.row.id &&
      latest.profileVersion === profileRow.version &&
      latest.briefRevision === current.briefRevision
        ? latest
        : {
            revision: latest?.revision ?? 0,
            identityId: identity.row.id,
            profileVersion: profileRow.version,
            briefRevision: current.briefRevision,
            quote: "",
            attribution: "",
            quoteSource: "",
            rightLine: "",
            crop: { x: 0.5, y: 0.5, zoom: 1.24 },
          };
    const next = edit({
      ...base,
      revision: (latest?.revision ?? 0) + 1,
      approvedAt: undefined,
    });
    await tx.livingSeasonPack.update({
      where: { id: pack.id },
      data: {
        characterBanner: jsonValue({
          revisions: [...revisions.slice(-98), next],
        }),
      },
    });
    return next;
  });
}

export async function saveLivingBannerCopy(userId: string, input: unknown) {
  const data = copyRequest.parse(input);
  return mutateBanner(userId, data.year, data.quarter, (draft) => ({
    ...draft,
    quote: data.quote,
    attribution: data.attribution,
    quoteSource: data.quoteSource,
    rightLine: data.rightLine,
  }));
}

export async function saveLivingBannerCrop(userId: string, input: unknown) {
  const data = cropRequest.parse(input);
  return mutateBanner(userId, data.year, data.quarter, (draft) => ({
    ...draft,
    crop: { x: data.x, y: data.y, zoom: data.zoom },
  }));
}

export async function uploadLivingBannerImage(
  userId: string,
  input: unknown,
  bytes: Buffer,
  generatedPackage?: ImagePromptPackage,
) {
  const data = assetRequest.parse(input);
  const uploadFingerprint = fingerprint({
    year: data.year,
    quarter: data.quarter,
    kind: data.bannerKind,
    promptReceipt: data.promptReceipt,
    bytesHash: fingerprint(bytes.toString("base64")),
  });
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: { profiles: { orderBy: { version: "desc" }, take: 1 } },
  });
  const profileRow = pack?.profiles[0];
  const ledger = pack
    ? livingBannerLedgerSchema.safeParse(pack.characterBanner)
    : null;
  const duplicate =
    data.operationKey && ledger?.success
      ? ledger.data.revisions.find(
          (revision) =>
            revision[data.bannerKind]?.uploadOperationKey === data.operationKey,
        )
      : undefined;
  if (duplicate) {
    if (duplicate[data.bannerKind]?.uploadFingerprint !== uploadFingerprint)
      throw new DirectionError(
        "This upload operation belongs to another file.",
        undefined,
        409,
      );
    return duplicate;
  }
  if (!pack || !profileRow || pack.identityId !== identity.row.id)
    throw new DirectionError("Save the character profile first.");
  livingCharacterProfileSchema.parse(profileRow.content);
  const normalized = await normalizeSeasonImage(bytes);
  const ratio = normalized.width / normalized.height;
  if (data.bannerKind === "desktop" && ratio < 1.4)
    throw new DirectionError("Choose a wide desktop banner.");
  if (data.bannerKind === "phone" && ratio > 0.85)
    throw new DirectionError("Choose a portrait phone banner.");
  if (
    data.bannerKind === "avatar" &&
    (normalized.width < 512 || normalized.height < 512)
  )
    throw new DirectionError(
      "Choose a profile picture at least 512 pixels wide and tall.",
    );
  const promptPackage =
    generatedPackage ??
    (await resolveSeasonImagePackage(userId, data.year, data.quarter, {
      variant:
        data.bannerKind === "avatar" ? "portrait" : `banner-${data.bannerKind}`,
      allowTemplateOnly: !data.promptReceipt,
      batchId: data.promptBatchId,
      receipt: data.promptReceipt,
    }));
  const prompt = promptPackage.prompt;
  if (data.promptReceipt && data.promptReceipt !== promptPackage.receipt)
    throw new DirectionError(
      "The copied prompt receipt is outdated. Copy the current prompt before uploading.",
    );
  const storageKey = `media/seasons/${season.id}/${randomUUID()}.webp`;
  const storage = getMediaStorage();
  await storage.put(storageKey, normalized.bytes);
  try {
    const saved = await mutateBanner(
      userId,
      data.year,
      data.quarter,
      (draft) => {
        if (
          draft.profileVersion !== profileRow.version ||
          draft.briefRevision !== pack.briefRevision
        )
          throw new DirectionError(
            "The character or visual brief changed during upload. Review the new version and retry.",
          );
        return {
          ...draft,
          [data.bannerKind]: {
            storageKey,
            prompt,
            promptPackage,
            manualPromptReceipt: generatedPackage
              ? undefined
              : data.promptReceipt,
            uploadOperationKey: data.operationKey,
            uploadFingerprint: data.operationKey
              ? uploadFingerprint
              : undefined,
            width: normalized.width,
            height: normalized.height,
          },
        };
      },
      async (tx) => {
        await lockSeason(tx, userId, data.year, data.quarter);
        if (data.operationKey) {
          const currentPack = await tx.livingSeasonPack.findUniqueOrThrow({
            where: { id: pack.id },
          });
          const currentLedger = livingBannerLedgerSchema.parse(
            currentPack.characterBanner,
          );
          const duplicate = currentLedger.revisions.find(
            (revision) =>
              revision[data.bannerKind]?.uploadOperationKey ===
              data.operationKey,
          );
          if (duplicate) {
            if (
              duplicate[data.bannerKind]?.uploadFingerprint !==
              uploadFingerprint
            )
              throw new DirectionError(
                "This upload operation belongs to another file.",
                undefined,
                409,
              );
            return duplicate;
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
        if (
          !generatedPackage &&
          current.pack.imagePromptMode === "AI_AUTHORED"
        ) {
          const stages =
            data.bannerKind === "avatar"
              ? ["PORTRAIT_PREPARATION", "PORTRAIT"]
              : ["BANNER_PREPARATION", "BANNER"];
          if (
            !stages.includes(current.pack.onboarding?.stage ?? "") ||
            current.pack.onboarding?.status !== "WAITING"
          )
            throw new DirectionError(
              "Open manual artwork preparation before uploading this composition.",
            );
        }
        if (!generatedPackage && current.pack.onboarding)
          await tx.seasonOnboardingRun.update({
            where: { id: current.pack.onboarding.id },
            data: {
              stage:
                data.bannerKind === "avatar"
                  ? "PORTRAIT_PREPARATION"
                  : "BANNER_PREPARATION",
              revision: { increment: 1 },
            },
          });
      },
    );
    if (saved[data.bannerKind]?.storageKey !== storageKey) {
      try {
        await storage.remove(storageKey);
      } catch {
        await prisma.livingMediaCleanup.create({
          data: { userId, packId: pack.id, storageKey },
        });
      }
    }
    return saved;
  } catch (error) {
    try {
      await storage.remove(storageKey);
    } catch {
      /* Preserve the original error. */
    }
    throw error;
  }
}

export async function approveLivingBanner(userId: string, input: unknown) {
  const data = locator
    .extend({ characterLikenessConfirmed: z.literal(true) })
    .parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  return prisma.$transaction(async (tx) => {
    await lockCurrentBannerSeason(
      tx,
      userId,
      data.year,
      data.quarter,
      identity.row,
    );
    const pack = await tx.livingSeasonPack.findUnique({
      where: { seasonId: season.id },
    });
    if (!pack || pack.identityId !== identity.row.id)
      throw new DirectionError("Character banner not found.");
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-banner:${pack.id}`},0))::text`;
    const current = await tx.livingSeasonPack.findUniqueOrThrow({
      where: { id: pack.id },
    });
    const profile = await tx.livingSeasonProfile.findFirst({
      where: { packId: pack.id },
      orderBy: { version: "desc" },
    });
    if (!profile?.approvedAt)
      throw new DirectionError("Approve the latest character profile first.");
    const ledger = livingBannerLedgerSchema.safeParse(current.characterBanner);
    const revisions = ledger.success ? ledger.data.revisions : [];
    const latest = revisions.at(-1);
    if (
      !latest ||
      !latest.desktop ||
      !latest.phone ||
      !latest.avatar ||
      (Boolean(latest.quote.trim()) &&
        (!latest.attribution.trim() || !latest.quoteSource.trim())) ||
      !latest.rightLine.trim()
    )
      throw new DirectionError(
        "Upload desktop, phone and profile portraits, then provide the right-side line and a source for any quote.",
      );
    if (
      latest.identityId !== identity.row.id ||
      latest.profileVersion !== profile.version ||
      latest.briefRevision !== current.briefRevision
    )
      throw new DirectionError(
        "Review banner art and copy for the latest character and visual brief.",
      );
    const approved = { ...latest, approvedAt: new Date().toISOString() };
    await tx.livingSeasonPack.update({
      where: { id: pack.id },
      data: {
        characterBanner: jsonValue({
          revisions: [...revisions.slice(0, -1), approved],
        }),
      },
    });
    return approved;
  });
}

export function assertLivingBannerReady(
  value: unknown,
  identityId: string,
  profileVersion: number,
  briefRevision: number,
) {
  if (
    !livingBannerReady(
      latestLivingBanner(value),
      identityId,
      profileVersion,
      briefRevision,
    )
  )
    throw new DirectionError(
      "Approve the current desktop and phone character banners, profile portrait, and banner copy before activation.",
    );
}
