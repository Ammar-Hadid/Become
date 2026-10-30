import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { getAiCredential } from "@/features/nexo/services/ai-credential.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  livingArtworkSlotSchema,
  livingCharacterProfileSchema,
} from "@/features/seasons/living/schemas/living-season.schema";
import {
  generateGoogleLivingImage,
  livingImageModel,
} from "@/features/seasons/living/adapters/google-image.adapter";
import {
  uploadLivingArtwork,
  uploadLivingReference,
} from "@/features/seasons/living/services/living-season-pack.service";
import {
  currentArtwork,
  slotKey,
} from "@/features/seasons/living/utils/living-pack.util";
import { livingBannerKindSchema } from "@/features/seasons/living/schemas/living-character-banner.schema";
import { resolveSeasonImagePackage } from "@/features/seasons/living/image-direction/services/image-prompt-package.service";
import { jsonValue } from "@/features/direction/services/direction-mutation.service";
import { uploadLivingBannerImage } from "./living-character-banner.service";
import {
  ensureSeasonImagePrompts,
  loadImagePromptContext,
} from "../image-direction/services/image-prompt-writing.service";
import { assertSceneAttempt } from "../onboarding/scene-attempt.service";
import { validateImageUploadContext } from "../image-direction/services/image-upload-context.service";

const requestSchema = z.object({
  operationKey: z
    .string()
    .regex(/^[a-zA-Z0-9-]{16,80}$/)
    .optional(),
  sceneAttemptId: z.string().optional(),
  onboardingLeaseToken: z.string().optional(),
  year: z.number().int().min(2020).max(2200),
  quarter: z.number().int().min(1).max(4),
  slot: livingArtworkSlotSchema,
  resolution: z.enum(["1K", "2K"]),
});

const budgetEurCents = 1500;
// Conservative per-request reservations cover the listed image-output rate plus
// prompt/reference input, text output, and exchange-rate movement. Provider
// invoices remain authoritative; Become stops starting calls at this ceiling.
const reservationEurCents = { "1K": 12, "2K": 17 } as const;

export async function generateLivingBanner(userId: string, input: unknown) {
  const data = requestSchema
    .pick({
      year: true,
      quarter: true,
      resolution: true,
      operationKey: true,
      onboardingLeaseToken: true,
    })
    .extend({ bannerKind: livingBannerKindSchema })
    .parse(input);
  if (await completedImageOperation(userId, data)) return;
  const season = await prisma.userSeason.findUnique({
    where: {
      userId_year_quarter: { userId, year: data.year, quarter: data.quarter },
    },
  });
  if (!season || season.closedAt)
    throw new DirectionError(
      "Open the Season before generating its character banner.",
    );
  const identity = await getCotsIdentity(userId, season.id);
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: {
      profiles: { orderBy: { version: "desc" }, take: 1 },
      references: { orderBy: { revision: "desc" }, take: 1 },
    },
  });
  if (!identity || !pack || pack.identityId !== identity.row.id)
    throw new DirectionError(
      "Save the current Season setting and character first.",
    );
  const profileRow = pack.profiles[0];
  if (!profileRow?.approvedAt)
    throw new DirectionError(
      "Approve the latest character profile before generating banner artwork.",
    );
  const sheet = pack.references[0];
  if (
    pack.referenceMode === "SHEET" &&
    (!sheet?.approvedAt ||
      sheet.briefRevision !== pack.briefRevision ||
      sheet.profileVersion !== profileRow.version)
  )
    throw new DirectionError(
      "Approve the current character reference sheet before generating banner artwork.",
    );
  const key = await getAiCredential(userId, "google");
  if (!key)
    throw new DirectionError(
      "Add your Google API key in Settings → Nexo before generating artwork.",
    );
  await ensureSeasonImagePrompts(
    userId,
    data.year,
    data.quarter,
    data.bannerKind === "avatar" ? "portrait" : "banner-desktop",
  );
  const promptPackage = await resolveSeasonImagePackage(
    userId,
    data.year,
    data.quarter,
    {
      variant:
        data.bannerKind === "avatar" ? "portrait" : `banner-${data.bannerKind}`,
      resolution: data.resolution,
    },
  );
  const prompt = promptPackage.prompt;
  const reserved = reservationEurCents[data.resolution];
  const run = await prisma.$transaction(async (tx) => {
    const context = await validateImageUploadContext(
      tx,
      userId,
      data.year,
      data.quarter,
      promptPackage,
    );
    if (
      context.pack.imagePromptMode === "AI_AUTHORED" &&
      (data.bannerKind === "avatar"
        ? context.pack.onboarding?.portraitMethod
        : context.pack.onboarding?.bannerMethod) === "MANUAL"
    )
      throw new DirectionError(
        "Choose AI creation before generating this composition.",
      );
    if (
      data.onboardingLeaseToken &&
      (context.pack.onboarding?.leaseToken !== data.onboardingLeaseToken ||
        context.pack.onboarding?.status !== "RUNNING")
    )
      throw new DirectionError(
        "This generation task was paused or replaced; no call was started.",
      );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-image-budget:${pack.id}`},0))::text`;
    if (
      data.operationKey &&
      (await tx.livingSeasonImageRun.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: data.operationKey },
        },
      }))
    )
      throw new DirectionError(
        "This image operation already exists. Refresh before retrying.",
      );
    const spent = await tx.livingSeasonImageRun.aggregate({
      where: { userId, packId: pack.id },
      _sum: { reservedEurCents: true },
    });
    if ((spent._sum.reservedEurCents ?? 0) + reserved > budgetEurCents)
      throw new DirectionError(
        "The €15 artwork API cap has been reached. Continue with manual uploads or revise the budget first.",
      );
    return tx.livingSeasonImageRun.create({
      data: {
        userId,
        operationKey: data.operationKey,
        packId: pack.id,
        chapter: 0,
        state: "BANNER",
        format: data.bannerKind.toUpperCase(),
        resolution: data.resolution,
        provider: "google",
        model: livingImageModel,
        prompt,
        promptPackage: jsonValue(promptPackage),
        referenceId: sheet?.id ?? null,
        reservedEurCents: reserved,
      },
    });
  });
  try {
    const references = await Promise.all(
      promptPackage.references.map((reference) =>
        getMediaStorage().read(reference.storageKey),
      ),
    );
    const bytes = await generateGoogleLivingImage({
      apiKey: key,
      prompt,
      references,
      aspectRatio: promptPackage.output!.aspectRatio,
      resolution: promptPackage.output!.resolution,
    });
    const current = await prisma.livingSeasonPack.findUnique({
      where: { id: pack.id },
      include: { profiles: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (
      current?.identityId !== identity.row.id ||
      current.briefRevision !== pack.briefRevision ||
      current.profiles[0]?.version !== profileRow.version
    )
      throw new DirectionError(
        "The character or visual brief changed during generation. Review the new profile before retrying.",
      );
    await uploadLivingBannerImage(
      userId,
      { year: data.year, quarter: data.quarter, bannerKind: data.bannerKind },
      bytes,
      promptPackage,
    );
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } catch (error) {
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED_BILLABLE",
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Generation failed",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function generateLivingArtwork(userId: string, input: unknown) {
  const data = requestSchema.parse(input);
  if (await completedImageOperation(userId, data)) return;
  const season = await prisma.userSeason.findUnique({
    where: {
      userId_year_quarter: { userId, year: data.year, quarter: data.quarter },
    },
  });
  if (!season || season.closedAt)
    throw new DirectionError(
      "Open the active Season before generating artwork.",
    );
  const identity = await getCotsIdentity(userId, season.id);
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: {
      profiles: { orderBy: { version: "desc" } },
      references: { orderBy: { revision: "desc" }, take: 1 },
      artwork: true,
    },
  });
  if (!identity || !pack || pack.identityId !== identity.row.id)
    throw new DirectionError(
      "Save a Living Season setting and character first.",
    );
  const profileRow = pack.profiles[0];
  if (!profileRow?.approvedAt)
    throw new DirectionError(
      "Approve the latest character profile before generating artwork.",
    );
  const sheet = pack.references[0];
  if (
    pack.referenceMode === "SHEET" &&
    (!sheet?.approvedAt ||
      sheet.briefRevision !== pack.briefRevision ||
      sheet.profileVersion !== profileRow.version)
  )
    throw new DirectionError(
      "Approve a reference sheet for this character and setting first.",
    );
  livingCharacterProfileSchema.parse(profileRow.content);
  const context = await loadImagePromptContext(userId, data.year, data.quarter);
  const attempt = await assertSceneAttempt(prisma, {
    userId,
    packId: pack.id,
    activeId: pack.activeSceneAttemptId,
    requestedId: data.sceneAttemptId,
    method: "AI",
    sourceFingerprint: context.coreFingerprint,
    required: pack.imagePromptMode === "AI_AUTHORED",
  });
  const sceneAttemptId = attempt?.id ?? null;
  const art = currentArtwork(
    pack.artwork,
    identity.row.id,
    pack.briefRevision,
    sceneAttemptId,
  );
  if (
    data.slot.chapter > 1 &&
    ["ON_TRACK", "NEUTRAL", "FAR_BEHIND"].some((state) =>
      ["DESKTOP", "MOBILE"].some(
        (format) =>
          !art.latest.get(
            slotKey({
              chapter: sceneAttemptId ? data.slot.chapter - 1 : 1,
              state,
              format,
            }),
          )?.approvedAt,
      ),
    )
  )
    throw new DirectionError(
      "Approve all six Chapter 1 pilot compositions before generating later chapters.",
    );
  const apiKey = await getAiCredential(userId, "google");
  if (!apiKey)
    throw new DirectionError(
      "Add your Google API key in Settings → Nexo before generating artwork.",
    );
  await ensureSeasonImagePrompts(
    userId,
    data.year,
    data.quarter,
    "scene",
    data.slot.chapter,
  );
  const promptPackage = await resolveSeasonImagePackage(
    userId,
    data.year,
    data.quarter,
    {
      variant: "scene-neutral-desktop",
      slot: data.slot,
      resolution: data.resolution,
    },
  );
  const prompt = promptPackage.prompt;
  const reference = pack.artwork
    .filter(
      (item) =>
        item.identityId === identity.row.id &&
        item.briefRevision === pack.briefRevision &&
        item.approvedAt &&
        item.sceneAttemptId === sceneAttemptId &&
        item.format === data.slot.format,
    )
    .sort((a, b) => b.chapter - a.chapter || b.revision - a.revision)[0];
  const reserved = reservationEurCents[data.resolution];
  const run = await prisma.$transaction(async (tx) => {
    const current = await validateImageUploadContext(
      tx,
      userId,
      data.year,
      data.quarter,
      promptPackage,
    );
    await assertSceneAttempt(tx, {
      userId,
      packId: pack.id,
      activeId: current.pack.activeSceneAttemptId,
      requestedId: sceneAttemptId,
      method: "AI",
      sourceFingerprint: current.sourceFingerprint,
      required: current.pack.imagePromptMode === "AI_AUTHORED",
    });
    if (
      data.onboardingLeaseToken &&
      (current.pack.onboarding?.leaseToken !== data.onboardingLeaseToken ||
        current.pack.onboarding?.status !== "RUNNING")
    )
      throw new DirectionError(
        "This image task was paused or replaced; no call was started.",
      );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-image-budget:${pack.id}`},0))::text`;
    if (
      data.operationKey &&
      (await tx.livingSeasonImageRun.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: data.operationKey },
        },
      }))
    )
      throw new DirectionError(
        "This image operation already exists. Refresh before retrying.",
      );
    const spent = await tx.livingSeasonImageRun.aggregate({
      where: { userId, packId: pack.id },
      _sum: { reservedEurCents: true },
    });
    if ((spent._sum.reservedEurCents ?? 0) + reserved > budgetEurCents)
      throw new DirectionError(
        "The €15 artwork API cap has been reached. Continue with manual ChatGPT uploads or revise the budget first.",
      );
    return tx.livingSeasonImageRun.create({
      data: {
        userId,
        operationKey: data.operationKey,
        packId: pack.id,
        ...data.slot,
        sceneAttemptId,
        resolution: data.resolution,
        provider: "google",
        model: livingImageModel,
        prompt,
        promptPackage: jsonValue(promptPackage),
        referenceArtworkId: reference?.id ?? null,
        referenceId: sheet?.id ?? null,
        reservedEurCents: reserved,
      },
    });
  });
  try {
    const references = await Promise.all(
      promptPackage.references.map((item) =>
        getMediaStorage().read(item.storageKey),
      ),
    );
    const bytes = await generateGoogleLivingImage({
      apiKey,
      prompt,
      references,
      aspectRatio: promptPackage.output!.aspectRatio,
      resolution: promptPackage.output!.resolution,
    });
    const currentPack = await prisma.livingSeasonPack.findUnique({
      where: { id: pack.id },
      select: { identityId: true, briefRevision: true },
    });
    if (
      currentPack?.identityId !== identity.row.id ||
      currentPack.briefRevision !== pack.briefRevision
    )
      throw new DirectionError(
        "The character or visual brief changed while the image was generating. Start a fresh draft.",
      );
    const artwork = await uploadLivingArtwork(
      userId,
      {
        year: data.year,
        quarter: data.quarter,
        slot: data.slot,
        sceneAttemptId: sceneAttemptId ?? undefined,
      },
      bytes,
      promptPackage,
    );
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        artworkId: artwork.id,
        completedAt: new Date(),
      },
    });
    return artwork;
  } catch (error) {
    // A failed provider call can still be billable. Retain its reservation.
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED_BILLABLE",
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Generation failed",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function generateLivingReference(userId: string, input: unknown) {
  const data = requestSchema
    .pick({ year: true, quarter: true, operationKey: true })
    .parse(input);
  if (await completedImageOperation(userId, data)) return;
  const season = await prisma.userSeason.findUnique({
    where: {
      userId_year_quarter: { userId, year: data.year, quarter: data.quarter },
    },
  });
  if (!season || season.closedAt)
    throw new DirectionError(
      "Open the active Season before generating its reference sheet.",
    );
  const identity = await getCotsIdentity(userId, season.id);
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: { profiles: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!identity || !pack || pack.identityId !== identity.row.id)
    throw new DirectionError(
      "Save a Living Season setting and character first.",
    );
  const profileRow = pack.profiles[0];
  if (!profileRow?.approvedAt)
    throw new DirectionError("Approve the latest character profile first.");
  const apiKey = await getAiCredential(userId, "google");
  if (!apiKey)
    throw new DirectionError(
      "Add your Google API key in Settings → Nexo before generating artwork.",
    );
  livingCharacterProfileSchema.parse(profileRow.content);
  const promptPackage = await resolveSeasonImagePackage(
    userId,
    data.year,
    data.quarter,
    { variant: "reference-sheet" },
  );
  const prompt = promptPackage.prompt;
  const reserved = reservationEurCents["2K"];
  const run = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-image-budget:${pack.id}`},0))::text`;
    if (
      data.operationKey &&
      (await tx.livingSeasonImageRun.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: data.operationKey },
        },
      }))
    )
      throw new DirectionError(
        "This image operation already exists. Refresh before retrying.",
      );
    const spent = await tx.livingSeasonImageRun.aggregate({
      where: { userId, packId: pack.id },
      _sum: { reservedEurCents: true },
    });
    if ((spent._sum.reservedEurCents ?? 0) + reserved > budgetEurCents)
      throw new DirectionError(
        "The €15 artwork API cap has been reached. Continue with manual ChatGPT uploads or revise the budget first.",
      );
    return tx.livingSeasonImageRun.create({
      data: {
        userId,
        operationKey: data.operationKey,
        packId: pack.id,
        chapter: 0,
        state: "REFERENCE",
        format: "SHEET",
        resolution: "2K",
        provider: "google",
        model: livingImageModel,
        prompt,
        promptPackage: jsonValue(promptPackage),
        reservedEurCents: reserved,
      },
    });
  });
  try {
    const bytes = await generateGoogleLivingImage({
      apiKey,
      prompt,
      references: await Promise.all(
        promptPackage.references.map((reference) =>
          getMediaStorage().read(reference.storageKey),
        ),
      ),
      aspectRatio: "16:9",
      resolution: "2K",
    });
    const current = await prisma.livingSeasonPack.findUnique({
      where: { id: pack.id },
      include: { profiles: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (
      current?.identityId !== identity.row.id ||
      current.briefRevision !== pack.briefRevision ||
      current.profiles[0]?.version !== profileRow.version
    )
      throw new DirectionError(
        "The character or visual brief changed while the reference was generating. Start a fresh draft.",
      );
    const reference = await uploadLivingReference(
      userId,
      data,
      bytes,
      promptPackage,
    );
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        referenceId: reference.id,
        completedAt: new Date(),
      },
    });
    return reference;
  } catch (error) {
    await prisma.livingSeasonImageRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED_BILLABLE",
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Generation failed",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function completedImageOperation(
  userId: string,
  data: {
    operationKey?: string;
    year: number;
    quarter: number;
    bannerKind?: string;
    slot?: { chapter: number; state: string; format: string };
  },
) {
  if (!data.operationKey) return false;
  const prior = await prisma.livingSeasonImageRun.findUnique({
    where: { userId_operationKey: { userId, operationKey: data.operationKey } },
    include: { pack: { include: { season: true } } },
  });
  if (!prior) return false;
  const sameSlot = data.slot
    ? prior.chapter === data.slot.chapter &&
      prior.state === data.slot.state &&
      prior.format === data.slot.format
    : data.bannerKind
      ? prior.state === "BANNER" &&
        prior.format === data.bannerKind.toUpperCase()
      : prior.state === "REFERENCE";
  if (
    prior.pack.season.year !== data.year ||
    prior.pack.season.quarter !== data.quarter ||
    !sameSlot
  )
    throw new DirectionError(
      "This image operation belongs to a different Season or composition.",
    );
  if (prior.status === "COMPLETED") return true;
  throw new DirectionError(
    "This image call failed or has an uncertain outcome. Its budget reservation is kept. Explicitly retry the image to authorize a new billable call.",
  );
}
