import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  currentArtwork,
  selectLivingScene,
  slotKey,
} from "@/features/seasons/living/utils/living-pack.util";
import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import { livingCharacterProfileSchema } from "@/features/seasons/living/schemas/living-season.schema";
import type { LivingSeasonFacts } from "@/features/seasons/living/types/living-season.types";
import { validateTextDocument } from "@/components/ui/document-editor/utils/document-editor-text.util";
import { getNexoSettings } from "@/features/nexo/queries/nexo-settings.query";
import {
  latestLivingBanner,
  livingBannerReady,
} from "@/features/seasons/living/schemas/living-character-banner.schema";
import { getPublishedImageTemplates } from "@/features/seasons/living/image-direction/services/image-direction-template.service";
import { visualIntentSchema } from "@/features/seasons/living/image-direction/schemas/visual-intent.schema";
import {
  visualBriefFingerprint,
  visualIntentMissing,
} from "@/features/seasons/living/image-direction/utils/visual-intent.util";
import {
  assembleImagePromptPackage,
  sceneTemplateKey,
  type ImagePromptVariant,
} from "@/features/seasons/living/image-direction/utils/image-prompt-package.util";
import { livingActiveSnapshotSchema } from "@/features/seasons/living/services/living-snapshot.service";
import { currentImageReferences } from "../image-direction/utils/image-references.util";
import { imagePromptCoreFingerprint } from "../image-direction/services/image-prompt-writing.service";
import type { ImagePromptPackage } from "../image-direction/utils/image-prompt-package.util";
import { publicImagePromptPackage } from "@/features/seasons/living/image-direction/services/image-prompt-package.service";

export async function getLivingSeasonPack(
  userId: string,
  year: number,
  quarter: number,
) {
  const season = await prisma.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
    select: {
      id: true,
      livingPack: {
        include: {
          profiles: { orderBy: { version: "desc" } },
          visualIntents: { orderBy: { version: "desc" }, take: 1 },
          artwork: { orderBy: { revision: "desc" } },
          references: { orderBy: { revision: "desc" } },
          sourceImages: {
            where: { retiredAt: null },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
          imageRuns: { select: { reservedEurCents: true } },
          sceneAttempts: {
            where: { status: { in: ["ACTIVE", "KEPT"] } },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
  if (!season) return null;
  const nexo = await getNexoSettings(userId);
  const responseAssignment = nexo.config.assignments.find(
    (item) => item.taskId === "cots.conversation",
  );
  const responseProfile = nexo.config.profiles.find(
    (item) => item.id === responseAssignment?.profileId,
  );
  const identity = await getCotsIdentity(userId, season.id);
  const pack = season.livingPack;
  const banner = latestLivingBanner(pack?.characterBanner);
  const templates = await getPublishedImageTemplates(userId);
  const latestProfile = pack?.profiles.find(
    (profile) => profile.identityId === identity?.row.id,
  );
  const approvedProfile = pack?.profiles.find(
    (profile) => profile.identityId === identity?.row.id && profile.approvedAt,
  );
  const parsedProfile = latestProfile
    ? livingCharacterProfileSchema.safeParse(latestProfile.content)
    : null;
  const profile = parsedProfile?.success ? parsedProfile.data : null;
  const latestIntent = pack?.visualIntents[0];
  const parsedIntent = latestIntent
    ? visualIntentSchema.safeParse(latestIntent.content)
    : null;
  const intentCurrent = Boolean(
    pack &&
    identity &&
    latestProfile &&
    latestIntent &&
    parsedIntent?.success &&
    latestIntent.identityId === identity.row.id &&
    latestIntent.profileVersion === latestProfile.version &&
    latestIntent.briefFingerprint ===
      visualBriefFingerprint(
        identity.row.id,
        latestProfile.version,
        pack.setting,
        pack.visualBrief,
      ),
  );
  const intentReady = Boolean(intentCurrent && latestIntent?.approvedAt);
  const originals =
    pack?.sourceImages
      .filter(
        (image) =>
          image.approvedAt &&
          image.identityId === identity?.row.id &&
          image.adaptation === identity?.view.adaptation,
      )
      .slice(0, 2) ?? [];
  const coreFingerprint =
    pack && identity && latestProfile && latestIntent
      ? imagePromptCoreFingerprint({
          identityId: identity.row.id,
          identityRevision: identity.row.revision,
          profileVersion: latestProfile.version,
          intentVersion: latestIntent.version,
          briefRevision: pack.briefRevision,
          originals: originals.map((image) => ({
            id: image.id,
            storageKey: image.storageKey,
          })),
        })
      : null;
  const written =
    coreFingerprint && pack
      ? await prisma.livingImagePromptBatch.findMany({
          where: {
            userId,
            packId: pack.id,
            status: "READY",
            input: { path: ["coreFingerprint"], equals: coreFingerprint },
          },
          orderBy: { version: "desc" },
          select: { groupKey: true, input: true, packages: true },
        })
      : [];
  const savedPrompts = new Map<string, ImagePromptPackage>();
  const seenGroups = new Set<string>();
  for (const batch of written) {
    if (seenGroups.has(batch.groupKey)) continue;
    const input = batch.input as { sceneAttemptId?: string | null };
    if (
      batch.groupKey.startsWith("chapter-") &&
      (input.sceneAttemptId ?? null) !== pack?.activeSceneAttemptId
    )
      continue;
    seenGroups.add(batch.groupKey);
    for (const value of Object.values(
      batch.packages as Record<string, unknown>,
    )) {
      const imagePackage = value as ImagePromptPackage;
      if (imagePackage.authorship && imagePackage.output?.resolution === "2K")
        savedPrompts.set(imagePackage.variant, imagePackage);
    }
  }
  const buildPackage = (
    variant: ImagePromptVariant,
    slot?: (typeof livingArtworkSlots)[number],
  ) => {
    const saved = savedPrompts.get(slot ? sceneTemplateKey(slot) : variant);
    if (
      variant !== "reference-sheet" &&
      saved &&
      latestProfile?.approvedAt &&
      intentReady &&
      originals.length
    )
      return saved;
    if (
      variant !== "reference-sheet" &&
      pack?.imagePromptMode === "AI_AUTHORED"
    )
      return latestProfile?.approvedAt && intentReady && originals.length
        ? (savedPrompts.get(slot ? sceneTemplateKey(slot) : variant) ?? null)
        : null;
    return pack &&
      identity &&
      latestProfile?.approvedAt &&
      profile &&
      parsedIntent?.success &&
      intentReady &&
      originals.length > 0 &&
      (!slot ||
        pack.referenceMode === "SHEET" ||
        livingBannerReady(
          banner,
          identity.row.id,
          latestProfile.version,
          pack.briefRevision,
        )) &&
      (pack.referenceMode === "ORIGINALS" ||
        variant === "reference-sheet" ||
        Boolean(
          pack.references[0]?.approvedAt &&
          pack.references[0]?.briefRevision === pack.briefRevision,
        ))
      ? assembleImagePromptPackage({
          variant,
          slot,
          profile,
          visualIntent: parsedIntent.data,
          setting: pack.setting,
          visualBrief: pack.visualBrief,
          identityId: identity.row.id,
          profileVersion: latestProfile.version,
          briefRevision: pack.briefRevision,
          intentVersion: latestIntent!.version,
          references: currentImageReferences({
            pack,
            identityId: identity.row.id,
            adaptation: identity.view.adaptation,
            profileVersion: latestProfile.version,
            year,
            quarter,
            variant,
            slot,
          }),
          templates,
          promptOverride:
            variant === "reference-sheet" ? pack.referencePromptOverride : null,
        })
      : null;
  };
  const referencePackage = buildPackage("reference-sheet");
  const bannerPromptPackages = {
    desktop: buildPackage("banner-desktop"),
    phone: buildPackage("banner-phone"),
    avatar: buildPackage("portrait"),
  };
  // Retained references belong to the identity that created them, not the
  // latest character selected for this Season.
  const reference = identity
    ? pack?.references.find((item) => item.identityId === identity.row.id)
    : undefined;
  const art =
    pack && identity
      ? currentArtwork(
          pack.imagePromptMode === "AI_AUTHORED" &&
            !pack.sceneAttempts.some(
              (attempt) =>
                attempt.id === pack.activeSceneAttemptId &&
                attempt.sourceFingerprint === coreFingerprint,
            )
            ? []
            : pack.artwork,
          identity.row.id,
          pack.briefRevision,
          pack.activeSceneAttemptId,
        )
      : null;
  const bannerHref = (kind: "desktop" | "phone" | "avatar") =>
    banner?.[kind]
      ? `/api/direction/seasons/living/banner/${year}/${quarter}/${banner.revision}/${kind}`
      : null;
  return {
    seasonId: season.id,
    identity: identity?.view ?? null,
    packId: pack?.id ?? null,
    referenceMode: pack?.referenceMode ?? "SHEET",
    sourceImages: (pack?.sourceImages ?? [])
      .filter(
        (image) =>
          image.identityId === identity?.row.id &&
          image.adaptation === identity?.view.adaptation,
      )
      .map((image) => ({
        id: image.id,
        label: image.label,
        sourceUrl: image.sourceUrl,
        provenance: image.provenance,
        approved: Boolean(image.approvedAt),
        href: `/api/direction/seasons/living/source-image/${image.id}`,
      })),
    originalsApproved: originals.length,
    active: Boolean(
      pack?.activeAt && identity && pack.identityId === identity.row.id,
    ),
    setting: pack?.setting ?? "",
    visualBrief: pack?.visualBrief ?? "",
    briefRevision: pack?.briefRevision ?? 1,
    profile: parsedProfile?.success ? parsedProfile.data : null,
    profileId: latestProfile?.id ?? null,
    profileVersion: latestProfile?.version ?? null,
    profileApproved: Boolean(latestProfile?.approvedAt),
    visualIntent: parsedIntent?.success
      ? {
          ...parsedIntent.data,
          version: latestIntent!.version,
          approved: intentReady,
          current: intentCurrent,
        }
      : null,
    visualIntentMissing: profile
      ? visualIntentMissing(profile)
      : ["Save a source-grounded character profile first."],
    responseAvailable: Boolean(
      responseProfile &&
      nexo.credentialStatus[responseProfile.provider].available,
    ),
    banner: banner
      ? {
          revision: banner.revision,
          approved: Boolean(
            identity &&
            latestProfile &&
            pack &&
            livingBannerReady(
              banner,
              identity.row.id,
              latestProfile.version,
              pack.briefRevision,
            ),
          ),
          current: Boolean(
            identity &&
            latestProfile &&
            pack &&
            banner.identityId === identity.row.id &&
            banner.profileVersion === latestProfile.version &&
            banner.briefRevision === pack.briefRevision,
          ),
          desktopHref: bannerHref("desktop"),
          phoneHref: bannerHref("phone"),
          avatarHref: bannerHref("avatar"),
          dimensions: {
            desktop: banner.desktop
              ? { width: banner.desktop.width, height: banner.desktop.height }
              : null,
            phone: banner.phone
              ? { width: banner.phone.width, height: banner.phone.height }
              : null,
            avatar: banner.avatar
              ? { width: banner.avatar.width, height: banner.avatar.height }
              : null,
          },
          desktopPrompt: banner.desktop?.prompt ?? null,
          phonePrompt: banner.phone?.prompt ?? null,
          avatarPrompt: banner.avatar?.prompt ?? null,
          quote: banner.quote,
          attribution: banner.attribution,
          quoteSource: banner.quoteSource,
          rightLine: banner.rightLine,
          crop: banner.crop,
        }
      : null,
    approvedProfileVersion: approvedProfile?.version ?? null,
    referenceId: reference?.id ?? null,
    referenceApproved: Boolean(
      reference?.approvedAt &&
      reference.briefRevision === pack?.briefRevision &&
      reference.profileVersion === latestProfile?.version,
    ),
    referenceHref: reference
      ? `/api/direction/seasons/living/reference/${reference.id}`
      : null,
    referencePrompt: referencePackage?.prompt ?? null,
    referencePromptPackage: referencePackage
      ? publicImagePromptPackage(referencePackage)
      : null,
    bannerPromptPackages: Object.fromEntries(
      Object.entries(bannerPromptPackages).map(([key, value]) => [
        key,
        value ? publicImagePromptPackage(value) : null,
      ]),
    ) as {
      desktop: ReturnType<typeof publicImagePromptPackage> | null;
      phone: ReturnType<typeof publicImagePromptPackage> | null;
      avatar: ReturnType<typeof publicImagePromptPackage> | null;
    },
    referencePromptDocument: pack?.referencePromptDocument
      ? validateTextDocument(pack.referencePromptDocument)
      : null,
    referencePromptCustomized: Boolean(
      pack?.referencePromptOverride || pack?.referencePromptDocument,
    ),
    slots: livingArtworkSlots.map((slot) => {
      const packageValue =
        reference?.approvedAt ||
        (pack?.referenceMode === "ORIGINALS" && Boolean(banner?.approvedAt))
          ? buildPackage(sceneTemplateKey(slot) as ImagePromptVariant, slot)
          : null;
      const latest = art?.latest.get(slotKey(slot));
      const approved = art?.approved.get(slotKey(slot));
      return {
        ...slot,
        latestId: latest?.id ?? null,
        latestRevision: latest?.revision ?? 0,
        width: latest?.width ?? 0,
        height: latest?.height ?? 0,
        latestApproved: Boolean(latest?.approvedAt),
        focalX: latest?.focalX ?? 0.5,
        focalY: latest?.focalY ?? 0.5,
        previewHref: latest
          ? `/api/direction/seasons/living/artwork/${latest.id}`
          : null,
        activeHref: approved
          ? `/api/direction/seasons/living/artwork/${approved.id}`
          : null,
        prompt: packageValue?.prompt ?? null,
        promptPackage: packageValue
          ? publicImagePromptPackage(packageValue)
          : null,
      };
    }),
    approvedCount: art ? 42 - art.missingForActivation.length : 0,
    creation: {
      promptMode: pack?.imagePromptMode ?? "TEMPLATE",
      activeAttemptId: pack?.activeSceneAttemptId ?? null,
      method:
        pack?.sceneAttempts.find(
          (attempt) => attempt.id === pack.activeSceneAttemptId,
        )?.method ?? null,
      attempts:
        pack?.sceneAttempts.map((attempt) => ({
          id: attempt.id,
          method: attempt.method,
          status: attempt.status,
          chapter: attempt.chapter,
          current: attempt.sourceFingerprint === coreFingerprint,
        })) ?? [],
    },
    imageBudgetEurCents: 1500,
    imageReservedEurCents:
      pack?.imageRuns.reduce((sum, run) => sum + run.reservedEurCents, 0) ?? 0,
  };
}

export async function getLivingSeasonScene(
  userId: string,
  seasonId: string,
  facts: LivingSeasonFacts,
) {
  const pack = await prisma.livingSeasonPack.findFirst({
    where: { userId, seasonId },
    include: {
      artwork: {
        where: { approvedAt: { not: null } },
        orderBy: { revision: "desc" },
      },
    },
  });
  if (!pack?.identityId) return null;
  const snapshot = livingActiveSnapshotSchema.safeParse(pack.activeSnapshot);
  const identity = await getCotsIdentity(userId, seasonId);
  if (
    !snapshot.success &&
    (!pack.activeAt || !identity || identity.row.id !== pack.identityId)
  )
    return null;
  const chosen = currentArtwork(
    snapshot.success
      ? snapshot.data.artwork.map((a) => ({
          ...a,
          identityId: snapshot.data.identityId,
          briefRevision: snapshot.data.briefRevision,
          approvedAt: new Date(a.approvedAt),
        }))
      : pack.artwork,
    snapshot.success ? snapshot.data.identityId : pack.identityId,
    snapshot.success ? snapshot.data.briefRevision : pack.briefRevision,
    snapshot.success ? undefined : pack.activeSceneAttemptId,
  ).approved;
  const scene = selectLivingScene(chosen, facts);
  if (!scene) return null;
  const { desktop, mobile, fallbackDesktop, fallbackMobile } = scene;
  const href = (id: string) => `/api/direction/seasons/living/artwork/${id}`;
  return {
    desktopHref: href(desktop.id),
    mobileHref: href(mobile.id),
    fallbackDesktopHref: href(fallbackDesktop.id),
    fallbackMobileHref: href(fallbackMobile.id),
    characterName: snapshot.success
      ? snapshot.data.characterName
      : identity!.view.displayName,
    state: facts.state,
    chapter: facts.chapter,
    desktopFocalX: desktop.focalX ?? 0.5,
    desktopFocalY: desktop.focalY ?? 0.5,
  };
}
