import "server-only";
import type { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { randomUUID } from "node:crypto";
import {
  recoverOnboardingHealth,
  requireOnboardingConfiguration,
} from "./onboarding-health.service";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  requireVersion,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import {
  emptySeasonDraft,
  seasonCalendar,
} from "@/features/seasons/utils/season-calendar.util";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  ensureLivingPack,
  requiredSeason,
} from "../services/living-season-pack.service";
import { preserveLivingSnapshot } from "../services/living-snapshot.service";
import { getLivingSeasonPack } from "../queries/living-season.query";
import {
  latestLivingBanner,
  livingBannerLedgerSchema,
  livingBannerReady,
  type LivingBannerRevision,
} from "../schemas/living-character-banner.schema";
import { livingArtworkSlots } from "../utils/living-artwork-prompt.util";
import { currentArtwork, slotKey } from "../utils/living-pack.util";
import { visualBriefFingerprint } from "../image-direction/utils/visual-intent.util";
import { imagePromptCoreFingerprint } from "../image-direction/services/image-prompt-writing.service";
import {
  assertSceneAttempt,
  chooseSceneAttempt,
  firstUnreviewedChapter,
  missingChapterSlots,
  purgeUnusedSceneAttempts,
  processLivingMediaCleanup,
} from "./scene-attempt.service";
import {
  preparationProgressSchema,
  onboardingCommandSchema,
  onboardingDraftSchema,
  onboardingNextStage,
  onboardingStageSchema,
  pendingImagesSchema,
  type OnboardingDraft,
} from "./onboarding.schema";

export function onboardingImages(chapter?: number, sceneAttemptId?: string) {
  return chapter
    ? livingArtworkSlots
        .filter((s) => s.chapter === chapter)
        .map((slot) => ({
          key: randomUUID(),
          kind: "scene" as const,
          slot,
          ...(sceneAttemptId ? { sceneAttemptId } : {}),
        }))
    : (["desktop", "phone"] as const).map((kind) => ({
        key: randomUUID(),
        kind,
      }));
}

/** Portrait/crop edits do not change this proof; any banner image or copy edit does. */
function bannerReviewToken(banner: LivingBannerRevision) {
  return `banner-review-${fingerprint({ identityId: banner.identityId, profileVersion: banner.profileVersion, briefRevision: banner.briefRevision, desktop: banner.desktop?.storageKey, phone: banner.phone?.storageKey, quote: banner.quote, attribution: banner.attribution, quoteSource: banner.quoteSource, rightLine: banner.rightLine })}`;
}

export async function getSeasonOnboarding(
  userId: string,
  year: number,
  quarter: number,
) {
  const pack = await getLivingSeasonPack(userId, year, quarter);
  if (!pack)
    throw new DirectionError("Save a Season opening first.", undefined, 404);
  let run = pack.packId
    ? await prisma.seasonOnboardingRun.findUnique({
        where: { packId: pack.packId },
      })
    : null;
  if (run) run = await recoverOnboardingHealth(run);
  const parsedDraft = onboardingDraftSchema.safeParse(run?.draft);
  return {
    pack,
    run: run
      ? {
          id: run.id,
          revision: run.revision,
          stage: onboardingStageSchema.parse(run.stage),
          status: run.status,
          chapter: run.chapter,
          question: run.question,
          error: run.error,
          draft: parsedDraft.success ? parsedDraft.data : null,
          completedTasks: run.completedTasks,
          preparationProgress:
            preparationProgressSchema.safeParse(run.preparationProgress).data ??
            null,
          pendingImageCount: pendingImagesSchema.parse(run.pendingImages)
            .length,
          bannerMethod:
            run.bannerMethod === "MANUAL"
              ? ("MANUAL" as const)
              : ("AI" as const),
          portraitMethod:
            run.portraitMethod === "MANUAL"
              ? ("MANUAL" as const)
              : ("AI" as const),
          identityCurrent:
            run.identityId === pack.identity?.id &&
            run.identityRevision === pack.identity?.identityRevision,
        }
      : null,
  };
}
export type SeasonOnboardingView = Awaited<
  ReturnType<typeof getSeasonOnboarding>
>;

/** Opening can start before identity exists; revisiting never overwrites saved work. */
export async function getSeasonOpeningOnboarding(
  userId: string,
  year: number,
  quarter: number,
) {
  const draft = emptySeasonDraft();
  await prisma.userSeason.createMany({
    data: {
      userId,
      year,
      quarter,
      stage: 3,
      character: jsonValue(draft.character),
      answers: jsonValue(draft.answers),
    },
    skipDuplicates: true,
  });
  return getSeasonOnboarding(userId, year, quarter);
}

export async function commandSeasonOnboarding(userId: string, input: unknown) {
  const data = onboardingCommandSchema.parse(input);
  const { season, identity } = await requiredSeason(
    userId,
    data.year,
    data.quarter,
  );
  if (data.action === "prepare")
    await ensureLivingPack(userId, data.year, data.quarter);
  await prisma.$transaction(
    async (tx) => {
      const lockedSeason = await lockSeason(
        tx,
        userId,
        data.year,
        data.quarter,
      );
      if (!lockedSeason || lockedSeason.closedAt)
        throw new DirectionError("This Season is closed.");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`season-onboarding:${season.id}`},0))::text`;
      const duplicate = await tx.seasonOnboardingCommand.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: data.operationKey },
        },
      });
      if (duplicate) {
        if (duplicate.payloadHash !== fingerprint(data))
          throw new DirectionError(
            "This operation belongs to different entries.",
            undefined,
            409,
          );
        return;
      }
      const pack = await tx.livingSeasonPack.findUniqueOrThrow({
        where: { seasonId: season.id },
        include: {
          profiles: { orderBy: { version: "desc" }, take: 1 },
          visualIntents: { orderBy: { version: "desc" }, take: 1 },
          artwork: true,
          sourceImages: true,
        },
      });
      const nowIdentity = await getCotsIdentity(userId, season.id, tx);
      if (
        !nowIdentity ||
        nowIdentity.row.id !== identity.row.id ||
        nowIdentity.row.revision !== identity.row.revision ||
        pack.identityId !== identity.row.id
      )
        throw new DirectionError(
          "The character changed. Confirm the current identity again.",
          undefined,
          409,
        );
      let run = await tx.seasonOnboardingRun.findUnique({
        where: { packId: pack.id },
      });
      if (data.action === "prepare") {
        await tx.livingSeasonPack.update({
          where: { id: pack.id },
          data: { imagePromptMode: "AI_AUTHORED" },
        });
        if (run?.status === "RUNNING")
          throw new DirectionError(
            "Pause the current work before changing the character.",
          );
        if (!run)
          run = await tx.seasonOnboardingRun.create({
            data: {
              userId,
              packId: pack.id,
              identityId: identity.row.id,
              identityRevision: identity.row.revision,
              briefRevision: pack.briefRevision,
            },
          });
        else if (
          run.identityId !== identity.row.id ||
          run.identityRevision !== identity.row.revision
        )
          run = await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              identityId: identity.row.id,
              identityRevision: identity.row.revision,
              revision: { increment: 1 },
              briefRevision: pack.briefRevision,
              profileVersion: 0,
              intentVersion: 0,
              stage: "WORLD",
              status: "WAITING",
              draft: Prisma.DbNull,
              preparationProgress: Prisma.DbNull,
              research: Prisma.DbNull,
              pendingImages: [],
              completedTasks: [],
              question: null,
              error: null,
              correction: "",
              chapter: 1,
            },
          });
      } else {
        if (!run)
          throw new DirectionError("Confirm a character before starting.");
        requireVersion(run.revision, data.expectedRevision);
        if (
          run.identityId !== identity.row.id ||
          run.identityRevision !== identity.row.revision
        )
          throw new DirectionError(
            "The selected character changed. Start with its current identity.",
            undefined,
            409,
          );
        if (
          run.status === "RUNNING" &&
          data.action !== "pause" &&
          data.action !== "switch-scenes-method"
        )
          throw new DirectionError(
            "Wait for the current task or pause it first.",
            undefined,
            409,
          );
        if (
          data.action === "select-scenes-method" ||
          data.action === "switch-scenes-method"
        ) {
          if (
            data.action === "select-scenes-method"
              ? run.stage !== "SCENE_METHOD"
              : ![
                  "SCENES",
                  "SCENE_PREPARATION",
                  "GENERATING_SCENES",
                  "READY",
                ].includes(run.stage)
          )
            throw new DirectionError(
              "Open the scene creation checkpoint before changing method.",
            );
          if (
            !pack.profiles[0]?.approvedAt ||
            !pack.visualIntents[0]?.approvedAt ||
            !livingBannerReady(
              latestLivingBanner(pack.characterBanner),
              identity.row.id,
              run.profileVersion,
              pack.briefRevision,
            )
          )
            throw new DirectionError(
              "Approve the current banners and portrait before choosing scene creation.",
            );
          const originals = pack.sourceImages
            .filter(
              (image) =>
                image.approvedAt &&
                !image.retiredAt &&
                image.identityId === identity.row.id &&
                image.adaptation === identity.view.adaptation,
            )
            .sort(
              (a, b) =>
                a.createdAt.getTime() - b.createdAt.getTime() ||
                a.id.localeCompare(b.id),
            )
            .slice(0, 2);
          const sourceFingerprint = imagePromptCoreFingerprint({
            identityId: identity.row.id,
            identityRevision: identity.row.revision,
            profileVersion: run.profileVersion,
            intentVersion: run.intentVersion,
            briefRevision: pack.briefRevision,
            originals: originals.map((image) => ({
              id: image.id,
              storageKey: image.storageKey,
            })),
          });
          const selected = await chooseSceneAttempt(tx, {
            userId,
            packId: pack.id,
            currentId: pack.activeSceneAttemptId,
            method: data.method,
            sourceFingerprint,
            retention:
              data.action === "switch-scenes-method" ? data.retention : "KEEP",
            activeSnapshot: pack.activeSnapshot,
          });
          const chapter = firstUnreviewedChapter(
            pack.artwork,
            identity.row.id,
            pack.briefRevision,
            selected.id,
          );
          const missing = missingChapterSlots(
            pack.artwork,
            identity.row.id,
            pack.briefRevision,
            selected.id,
            chapter,
          );
          const uncertain = await tx.livingSeasonImageRun.count({
            where: {
              packId: pack.id,
              sceneAttemptId: selected.id,
              status: { not: "COMPLETED" },
            },
          });
          const automatic =
            data.method === "AI" && missing.length > 0 && !uncertain;
          await tx.livingSceneAttempt.update({
            where: { id: selected.id },
            data: { chapter },
          });
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              chapter,
              stage:
                data.method === "MANUAL"
                  ? "SCENE_PREPARATION"
                  : automatic
                    ? "GENERATING_SCENES"
                    : "SCENES",
              status: automatic ? "QUEUED" : "WAITING",
              pendingImages: jsonValue(
                automatic
                  ? missing.map((slot) => ({
                      key: randomUUID(),
                      kind: "scene",
                      slot,
                      sceneAttemptId: selected.id,
                    }))
                  : [],
              ),
              error: uncertain
                ? "This attempt contains an unfinished provider call. Review saved work and explicitly retry missing images; no call was repeated."
                : null,
              revision: { increment: 1 },
            },
          });
        } else if (
          data.action === "set-artwork-method" ||
          data.action === "generate-artwork" ||
          data.action === "review-artwork" ||
          data.action === "open-artwork"
        ) {
          if (run.leaseToken && run.leaseUntil && run.leaseUntil > new Date())
            throw new DirectionError(
              "The current call is finishing. Open preparation again shortly.",
            );
          const target = data.target;
          const preparation =
            target === "BANNERS"
              ? "BANNER_PREPARATION"
              : target === "PORTRAIT"
                ? "PORTRAIT_PREPARATION"
                : "SCENE_PREPARATION";
          const reviewStage =
            target === "BANNERS"
              ? "BANNER"
              : target === "PORTRAIT"
                ? "PORTRAIT"
                : "SCENES";
          const stoppedGeneration =
            data.action === "open-artwork" &&
            ["FAILED", "PAUSED"].includes(run.status) &&
            run.stage ===
              (target === "BANNERS"
                ? "GENERATING_BANNER"
                : target === "PORTRAIT"
                  ? "GENERATING_PORTRAIT"
                  : "GENERATING_SCENES");
          if (
            ![preparation, reviewStage].includes(run.stage) &&
            !stoppedGeneration
          )
            throw new DirectionError(
              "Open the matching imagery checkpoint first.",
            );
          if (data.action === "set-artwork-method") {
            await tx.seasonOnboardingRun.update({
              where: { id: run.id },
              data: {
                stage: preparation,
                status: "WAITING",
                ...(target === "BANNERS"
                  ? { bannerMethod: data.method }
                  : { portraitMethod: data.method }),
                pendingImages: [],
                error: null,
                revision: { increment: 1 },
              },
            });
          } else if (data.action === "open-artwork") {
            await tx.seasonOnboardingRun.update({
              where: { id: run.id },
              data: {
                stage: preparation,
                status: "WAITING",
                pendingImages: [],
                error: null,
                revision: { increment: 1 },
              },
            });
          } else if (data.action === "review-artwork") {
            const banner = latestLivingBanner(pack.characterBanner);
            if (target === "CHAPTER") {
              const art = currentArtwork(
                pack.artwork,
                identity.row.id,
                pack.briefRevision,
                pack.activeSceneAttemptId,
              );
              if (
                !pack.activeSceneAttemptId ||
                livingArtworkSlots
                  .filter((slot) => slot.chapter === run!.chapter)
                  .some((slot) => !art.latest.has(slotKey(slot)))
              )
                throw new DirectionError(
                  "Upload all six current compositions before reviewing this chapter.",
                );
            } else if (
              !banner ||
              banner.identityId !== identity.row.id ||
              banner.profileVersion !== run.profileVersion ||
              banner.briefRevision !== pack.briefRevision ||
              (target === "BANNERS"
                ? !banner.desktop || !banner.phone
                : !banner.avatar)
            )
              throw new DirectionError(
                "Upload the current compositions before opening review.",
              );
            await tx.seasonOnboardingRun.update({
              where: { id: run.id },
              data: {
                stage: reviewStage,
                status: "WAITING",
                error: null,
                revision: { increment: 1 },
              },
            });
          } else {
            let pending: z.infer<typeof pendingImagesSchema> =
              target === "BANNERS"
                ? onboardingImages()
                : target === "PORTRAIT"
                  ? [{ key: randomUUID(), kind: "avatar" as const }]
                  : onboardingImages(
                      run.chapter,
                      pack.activeSceneAttemptId ?? undefined,
                    );
            if (target === "CHAPTER") {
              const attempt = pack.activeSceneAttemptId
                ? await tx.livingSceneAttempt.findFirst({
                    where: {
                      id: pack.activeSceneAttemptId,
                      userId,
                      packId: pack.id,
                      status: "ACTIVE",
                      method: "AI",
                    },
                  })
                : null;
              if (!attempt)
                throw new DirectionError(
                  "Choose AI creation for all chapters before generating scenes.",
                );
              const missing = missingChapterSlots(
                pack.artwork,
                identity.row.id,
                pack.briefRevision,
                attempt.id,
                run.chapter,
              );
              pending = pending.filter(
                (image) =>
                  image.kind === "scene" &&
                  "slot" in image &&
                  missing.some(
                    (slot) => slotKey(slot) === slotKey(image.slot!),
                  ),
              );
            } else if (
              (target === "BANNERS" ? run.bannerMethod : run.portraitMethod) !==
              "AI"
            )
              throw new DirectionError(
                "Choose AI creation before generating this artwork.",
              );
            await tx.seasonOnboardingRun.update({
              where: { id: run.id },
              data: {
                stage: pending.length
                  ? target === "BANNERS"
                    ? "GENERATING_BANNER"
                    : target === "PORTRAIT"
                      ? "GENERATING_PORTRAIT"
                      : "GENERATING_SCENES"
                  : reviewStage,
                status: pending.length ? "QUEUED" : "WAITING",
                pendingImages: jsonValue(pending),
                error: null,
                revision: { increment: 1 },
              },
            });
          }
        } else if (data.action === "save-world") {
          if (run.leaseToken && run.leaseUntil && run.leaseUntil > new Date())
            throw new DirectionError(
              "The paused call is finishing. Wait before changing its inputs.",
            );
          const stoppedAssembly =
            run.stage === "ASSEMBLING" &&
            ["FAILED", "PAUSED"].includes(run.status);
          if (
            !["WORLD", "SUMMARY", "NEEDS_INPUT"].includes(run.stage) &&
            !stoppedAssembly
          )
            throw new DirectionError(
              "Pause and return to the world step before editing it.",
            );
          if (
            pack.setting !== data.setting ||
            pack.visualBrief !== data.visualDirection ||
            stoppedAssembly
          ) {
            await preserveLivingSnapshot(pack.id, false, tx);
            await tx.livingSeasonPack.update({
              where: { id: pack.id },
              data: {
                setting: data.setting,
                visualBrief: data.visualDirection,
                briefRevision: { increment: 1 },
                activeAt: null,
              },
            });
            await tx.seasonOnboardingRun.update({
              where: { id: run.id },
              data: {
                stage: "WORLD",
                status: "WAITING",
                error: null,
                leaseToken: null,
                leaseUntil: null,
                briefRevision: pack.briefRevision + 1,
                revision: { increment: 1 },
              },
            });
          }
        } else if (data.action === "pause") {
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: { status: "PAUSED", revision: { increment: 1 } },
          });
        } else if (data.action === "resume") {
          if (!["PAUSED", "FAILED"].includes(run.status))
            throw new DirectionError("There is no paused work to resume.");
          if (run.leaseToken && run.leaseUntil && run.leaseUntil > new Date())
            throw new DirectionError(
              "The in-flight call is finishing. Resume shortly.",
            );
          // A failed or interrupted call is never silently repeated.
          const pending = pendingImagesSchema.parse(run.pendingImages);
          const uncertain = await tx.livingSeasonImageRun.count({
            where: {
              userId,
              operationKey: { in: pending.map((p) => p.key) },
              status: { not: "COMPLETED" },
            },
          });
          if (uncertain)
            throw new DirectionError(
              "An image call may have been billed. Use Retry unfinished work to authorize new calls.",
            );
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              status: [
                "ASSEMBLING",
                "GENERATING_BANNER",
                "GENERATING_PORTRAIT",
                "GENERATING_SCENES",
              ].includes(run.stage)
                ? "QUEUED"
                : "WAITING",
              leaseToken: null,
              leaseUntil: null,
              preparationProgress: Prisma.DbNull,
              error: null,
              revision: { increment: 1 },
            },
          });
        } else if (data.action === "start" || data.action === "correct") {
          if (run.leaseToken && run.leaseUntil && run.leaseUntil > new Date())
            throw new DirectionError(
              "The paused call is finishing. Wait before changing its inputs.",
            );
          if (
            data.action === "start" &&
            !["WORLD", "SUMMARY", "NEEDS_INPUT"].includes(run.stage) &&
            !(
              run.stage === "ASSEMBLING" &&
              ["FAILED", "PAUSED"].includes(run.status)
            )
          )
            throw new DirectionError(
              "Return to the world step before starting.",
            );
          if (
            data.action === "correct" &&
            !["SUMMARY", "NEEDS_INPUT", "WORLD"].includes(run.stage)
          )
            throw new DirectionError(
              "Changes can only be requested from World & mood or summary review.",
            );
          const correction =
            data.action === "correct"
              ? [run.correction, data.correction]
                  .filter(Boolean)
                  .join(
                    "\n\nLater owner correction (supersedes conflicts above):\n",
                  )
              : "";
          if (correction.length > 20000)
            throw new DirectionError(
              "The correction history is full. Consolidate your requirements in World & mood and start preparation again.",
            );
          await preserveLivingSnapshot(pack.id, false, tx);
          const briefRevision = pack.briefRevision + 1;
          if (data.action === "start") {
            await tx.livingSeasonPack.update({
              where: { id: pack.id },
              data: {
                setting: data.setting,
                visualBrief: data.visualDirection,
                referenceMode: "ORIGINALS",
                briefRevision,
                activeAt: null,
              },
            });
          } else
            await tx.livingSeasonPack.update({
              where: { id: pack.id },
              data: { briefRevision, activeAt: null },
            });
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              stage: "ASSEMBLING",
              status: "QUEUED",
              briefRevision,
              profileVersion: pack.profiles[0]?.version ?? 0,
              intentVersion: pack.visualIntents[0]?.version ?? 0,
              correction,
              // A correction can expand canon scope or challenge the evidence.
              // Research must see it before assembly reuses the earlier draft.
              preparationProgress: Prisma.DbNull,
              research: Prisma.DbNull,
              question: null,
              error: null,
              pendingImages: [],
              completedTasks: [],
              revision: { increment: 1 },
            },
          });
        } else if (data.action === "regenerate") {
          if (
            ![
              "BANNER",
              "PORTRAIT",
              "SCENES",
              "GENERATING_PORTRAIT",
              "GENERATING_BANNER",
              "GENERATING_SCENES",
            ].includes(run.stage)
          )
            throw new DirectionError(
              "Open an artwork review to retry an image.",
            );
          let pending = pendingImagesSchema.parse(run.pendingImages);
          if (run.status === "FAILED") {
            const completed = await tx.livingSeasonImageRun.findMany({
              where: {
                userId,
                operationKey: { in: pending.map((p) => p.key) },
                status: "COMPLETED",
              },
            });
            pending = pending
              .filter((p) => !completed.some((c) => c.operationKey === p.key))
              .map((p) => ({ ...p, key: randomUUID() }));
          } else if (data.target === "scene") {
            if (
              pack.activeSceneAttemptId &&
              (
                await tx.livingSceneAttempt.findUnique({
                  where: { id: pack.activeSceneAttemptId },
                })
              )?.method !== "AI"
            )
              throw new DirectionError(
                "This scene attempt uses manual uploads. Open upload preparation to replace it.",
              );
            const artwork = pack.artwork.find(
              (a) =>
                a.id === data.artworkId &&
                a.chapter === run!.chapter &&
                a.briefRevision === pack.briefRevision &&
                a.identityId === identity.row.id,
            );
            if (!artwork || run.stage !== "SCENES")
              throw new DirectionError(
                "Choose an image from the current chapter.",
              );
            pending = [
              {
                key: randomUUID(),
                kind: "scene",
                slot: {
                  chapter: artwork.chapter,
                  state: artwork.state,
                  format: artwork.format,
                },
                ...(pack.activeSceneAttemptId
                  ? { sceneAttemptId: pack.activeSceneAttemptId }
                  : {}),
              },
            ].map((p) => pendingImagesSchema.parse([p])[0]);
          } else {
            if (
              data.target === "avatar"
                ? run.stage !== "PORTRAIT"
                : run.stage !== "BANNER"
            )
              throw new DirectionError(
                "Open the matching banner or profile portrait review first.",
              );
            pending = [{ key: randomUUID(), kind: data.target }];
          }
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              pendingImages: jsonValue(pending),
              stage: run.stage.includes("SCENES")
                ? "GENERATING_SCENES"
                : run.stage.includes("PORTRAIT")
                  ? "GENERATING_PORTRAIT"
                  : "GENERATING_BANNER",
              status: "QUEUED",
              error: null,
              leaseToken: null,
              leaseUntil: null,
              revision: { increment: 1 },
            },
          });
        } else {
          if (run.status !== "WAITING")
            throw new DirectionError("Resume this step before approving it.");
          let stage = onboardingNextStage(
            onboardingStageSchema.parse(run.stage),
            data.action,
            run.chapter,
          );
          if (run.briefRevision !== pack.briefRevision)
            throw new DirectionError(
              "The visual brief changed. Review a new summary first.",
              undefined,
              409,
            );
          if (
            ["approve-chapter", "activate"].includes(data.action) &&
            pack.imagePromptMode === "AI_AUTHORED"
          ) {
            const current = await tx.livingSceneAttempt.findFirst({
              where: {
                id: pack.activeSceneAttemptId ?? "",
                userId,
                packId: pack.id,
                status: "ACTIVE",
              },
            });
            const originals = pack.sourceImages
              .filter(
                (image) =>
                  image.approvedAt &&
                  !image.retiredAt &&
                  image.identityId === identity.row.id &&
                  image.adaptation === identity.view.adaptation,
              )
              .sort(
                (a, b) =>
                  a.createdAt.getTime() - b.createdAt.getTime() ||
                  a.id.localeCompare(b.id),
              )
              .slice(0, 2);
            if (
              !current ||
              !pack.profiles[0]?.approvedAt ||
              !pack.visualIntents[0]?.approvedAt
            )
              throw new DirectionError(
                "Review the current character, world and scene attempt before approval.",
              );
            await assertSceneAttempt(tx, {
              userId,
              packId: pack.id,
              activeId: pack.activeSceneAttemptId,
              method: current.method === "MANUAL" ? "MANUAL" : "AI",
              required: true,
              sourceFingerprint: imagePromptCoreFingerprint({
                identityId: identity.row.id,
                identityRevision: identity.row.revision,
                profileVersion: pack.profiles[0].version,
                intentVersion: pack.visualIntents[0].version,
                briefRevision: pack.briefRevision,
                originals: originals.map((image) => ({
                  id: image.id,
                  storageKey: image.storageKey,
                })),
              }),
            });
          }
          if (data.action === "approve-summary") {
            const images = pack.sourceImages.filter(
              (i) =>
                data.sourceImageIds.includes(i.id) &&
                i.identityId === identity.row.id &&
                i.adaptation === identity.view.adaptation &&
                !i.retiredAt,
            );
            if (images.length !== new Set(data.sourceImageIds).size)
              throw new DirectionError(
                "Review authentic images for this character and adaptation first.",
              );
            await tx.livingSeasonSourceImage.updateMany({
              where: { id: { in: images.map((i) => i.id) }, userId },
              data: { approvedAt: new Date() },
            });

            const draft = onboardingDraftSchema.parse(run.draft);
            const profile = pack.profiles[0];
            const intent = pack.visualIntents[0];
            if (
              !profile ||
              !intent ||
              profile.version !== run.profileVersion ||
              intent.version !== run.intentVersion ||
              !isDeepStrictEqual(profile.content, jsonValue(draft.profile)) ||
              !isDeepStrictEqual(intent.content, jsonValue(draft.visualIntent))
            )
              throw new DirectionError(
                "The saved draft changed. Assemble and review it again.",
                undefined,
                409,
              );
            await tx.livingSeasonProfile.update({
              where: { id: profile.id },
              data: { approvedAt: new Date() },
            });
            await tx.livingVisualIntent.update({
              where: { id: intent.id },
              data: { approvedAt: new Date() },
            });
          } else if (
            data.action === "approve-banner" ||
            data.action === "approve-portrait"
          ) {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`living-banner:${pack.id}`},0))::text`;
            const currentBanner = await tx.livingSeasonPack.findUniqueOrThrow({
              where: { id: pack.id },
            });
            const ledger = livingBannerLedgerSchema.parse(
              currentBanner.characterBanner,
            );
            const banner = ledger.revisions.at(-1);
            if (
              !banner?.desktop ||
              !banner.phone ||
              banner.revision !== data.bannerRevision ||
              banner.profileVersion !== run.profileVersion ||
              banner.briefRevision !== pack.briefRevision ||
              banner.identityId !== identity.row.id
            )
              throw new DirectionError(
                "Review the current desktop and phone banners.",
                undefined,
                409,
              );
            if (
              !banner.rightLine.trim() ||
              (banner.quote.trim() &&
                (!banner.attribution.trim() || !banner.quoteSource.trim()))
            )
              throw new DirectionError(
                "Complete the banner copy and any quote attribution before approval.",
              );
            const checkpoints = Array.isArray(run.completedTasks)
              ? run.completedTasks
              : [];
            const token = bannerReviewToken(banner);
            if (data.action === "approve-banner") {
              await tx.seasonOnboardingRun.update({
                where: { id: run.id },
                data: { completedTasks: jsonValue([...checkpoints, token]) },
              });
              // Existing drafts may already have a portrait; review it without buying a replacement.
              if (banner.avatar) stage = "PORTRAIT";
            } else {
              if (!banner.avatar || !checkpoints.includes(token))
                throw new DirectionError(
                  "Approve the unchanged banners before reviewing this profile portrait.",
                  undefined,
                  409,
                );
              banner.approvedAt = new Date().toISOString();
              if (
                !livingBannerReady(
                  banner,
                  identity.row.id,
                  run.profileVersion,
                  pack.briefRevision,
                )
              )
                throw new DirectionError(
                  "Review the current profile portrait before creating scenes.",
                );
              await tx.livingSeasonPack.update({
                where: { id: pack.id },
                data: { characterBanner: jsonValue(ledger) },
              });
            }
          } else if (data.action === "approve-chapter") {
            const art = currentArtwork(
              pack.artwork,
              identity.row.id,
              pack.briefRevision,
              pack.activeSceneAttemptId,
            );
            const latest = livingArtworkSlots
              .filter((s) => s.chapter === run!.chapter)
              .map((s) => art.latest.get(slotKey(s)));
            if (
              new Set(data.artworkIds).size !== 6 ||
              latest.some((a) => !a || !data.artworkIds.includes(a.id))
            )
              throw new DirectionError(
                "Review all six current compositions for this chapter.",
                undefined,
                409,
              );
            await tx.livingSeasonArtwork.updateMany({
              where: { id: { in: data.artworkIds }, userId },
              data: { approvedAt: new Date() },
            });
            if (pack.activeSceneAttemptId) {
              const selected = await tx.livingSceneAttempt.findFirst({
                where: {
                  id: pack.activeSceneAttemptId,
                  userId,
                  packId: pack.id,
                  status: "ACTIVE",
                },
              });
              if (!selected)
                throw new DirectionError(
                  "The selected scene attempt changed. Reopen this chapter.",
                );
              if (selected.method === "MANUAL" && run.chapter < 7)
                stage = "SCENE_PREPARATION";
              await tx.livingSceneAttempt.update({
                where: { id: selected.id },
                data: { chapter: Math.min(7, run.chapter + 1) },
              });
            }
          } else if (data.action === "activate") {
            const art = currentArtwork(
              pack.artwork,
              identity.row.id,
              pack.briefRevision,
              pack.activeSceneAttemptId,
            );
            if (
              art.missingForActivation.length ||
              !pack.profiles[0]?.approvedAt ||
              !pack.visualIntents[0]?.approvedAt ||
              !livingBannerReady(
                latestLivingBanner(pack.characterBanner),
                identity.row.id,
                run.profileVersion,
                pack.briefRevision,
              ) ||
              !pack.sourceImages.some(
                (i) =>
                  i.approvedAt &&
                  !i.retiredAt &&
                  i.identityId === identity.row.id &&
                  i.adaptation === identity.view.adaptation,
              )
            )
              throw new DirectionError(
                "Approve the complete current Season pack before activation.",
              );
            await tx.livingSeasonPack.update({
              where: { id: pack.id },
              data: { activeAt: new Date() },
            });
            await preserveLivingSnapshot(pack.id, true, tx);
            const activated = await tx.livingSeasonPack.findUniqueOrThrow({
              where: { id: pack.id },
            });
            await purgeUnusedSceneAttempts(
              tx,
              userId,
              pack.id,
              pack.activeSceneAttemptId,
              activated.activeSnapshot,
            );
            if (!lockedSeason.openingCompletedAt) {
              const opened = await tx.userSeason.update({
                where: { id: season.id },
                data: {
                  openingCompletedAt: new Date(),
                  version: { increment: 1 },
                },
              });
              await tx.seasonChange.create({
                data: {
                  userId,
                  seasonId: season.id,
                  operationKey: data.operationKey,
                  fingerprint: fingerprint(data),
                  version: opened.version,
                  kind: "OPENED",
                  reason: "Guided Season pack reviewed and activated.",
                  snapshot: jsonValue({
                    title: opened.title,
                    intention: opened.intention,
                    answers: opened.answers,
                    character: opened.character,
                    stage: opened.stage,
                  }),
                },
              });
              const phase = seasonCalendar(data.year, data.quarter).phase;
              if (
                ["MIDPOINT", "FINAL_14", "FINAL_7", "FINAL_3"].includes(phase)
              )
                await tx.seasonMilestone.upsert({
                  where: { seasonId_key: { seasonId: season.id, key: phase } },
                  create: {
                    userId,
                    seasonId: season.id,
                    key: phase,
                    disposition: "OPENING_FULFILLED",
                  },
                  update: {},
                });
            }
          }
          const chapter =
            data.action === "approve-chapter" && run.chapter < 7
              ? run.chapter + 1
              : run.chapter;
          const pending =
            stage === "GENERATING_BANNER"
              ? onboardingImages()
              : stage === "GENERATING_PORTRAIT"
                ? [{ key: randomUUID(), kind: "avatar" as const }]
                : stage === "GENERATING_SCENES"
                  ? onboardingImages(
                      chapter,
                      pack.activeSceneAttemptId ?? undefined,
                    )
                  : [];
          await tx.seasonOnboardingRun.update({
            where: { id: run.id },
            data: {
              stage,
              chapter,
              status: pending.length ? "QUEUED" : "WAITING",
              pendingImages: jsonValue(pending),
              revision: { increment: 1 },
            },
          });
        }
      }
      const queued = await tx.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: run!.id },
      });
      if (queued.status === "QUEUED")
        await requireOnboardingConfiguration(userId, queued.stage, tx);
      await tx.seasonOnboardingCommand.create({
        data: {
          userId,
          runId: run!.id,
          operationKey: data.operationKey,
          payloadHash: fingerprint(data),
        },
      });
    },
    { timeout: 15000 },
  );
  await processLivingMediaCleanup();
  return getSeasonOnboarding(userId, data.year, data.quarter);
}

/** Saves only a draft, atomically; a worker may never approve its own output. */
export async function saveOnboardingDraft(
  runId: string,
  leaseToken: string,
  draft: OnboardingDraft,
) {
  return prisma.$transaction(
    async (tx) => {
      const run = await tx.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: runId },
        include: { pack: { include: { season: true } } },
      });
      await lockSeason(
        tx,
        run.userId,
        run.pack.season.year,
        run.pack.season.quarter,
      );
      const fresh = await tx.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: run.id },
      });
      if (
        fresh.leaseToken !== leaseToken ||
        !["RUNNING", "PAUSED"].includes(fresh.status)
      )
        return;
      const identity = await getCotsIdentity(run.userId, run.pack.seasonId, tx);
      const pack = await tx.livingSeasonPack.findUniqueOrThrow({
        where: { id: run.packId },
      });
      const latestProfile = await tx.livingSeasonProfile.findFirst({
        where: { packId: pack.id },
        orderBy: { version: "desc" },
      });
      const latestIntent = await tx.livingVisualIntent.findFirst({
        where: { packId: pack.id },
        orderBy: { version: "desc" },
      });
      if (
        !identity ||
        identity.row.id !== run.identityId ||
        identity.row.revision !== run.identityRevision ||
        pack.briefRevision !== run.briefRevision ||
        (latestProfile?.version ?? 0) !== run.profileVersion ||
        (latestIntent?.version ?? 0) !== run.intentVersion
      )
        throw new DirectionError(
          "The character or saved draft changed while AI was assembling. Review the current Season.",
        );
      const value = onboardingDraftSchema.parse(draft);
      if (
        value.profile.characterName !== identity.view.displayName ||
        value.profile.sourceWork !== identity.view.sourceWork ||
        value.profile.adaptation !== identity.view.adaptation
      )
        throw new DirectionError("The draft changed the chosen identity.");
      await preserveLivingSnapshot(pack.id, false, tx);
      const profileVersion = run.profileVersion + 1;
      const intentVersion = run.intentVersion + 1;
      const briefRevision = pack.briefRevision + 1;
      await tx.livingSeasonProfile.create({
        data: {
          userId: run.userId,
          packId: pack.id,
          identityId: run.identityId,
          version: profileVersion,
          content: jsonValue(value.profile),
        },
      });
      await tx.livingVisualIntent.create({
        data: {
          userId: run.userId,
          packId: pack.id,
          identityId: run.identityId,
          profileVersion,
          version: intentVersion,
          briefFingerprint: visualBriefFingerprint(
            run.identityId,
            profileVersion,
            pack.setting,
            pack.visualBrief,
          ),
          content: jsonValue(value.visualIntent),
        },
      });
      const ledger = livingBannerLedgerSchema.safeParse(pack.characterBanner);
      const revisions = ledger.success ? ledger.data.revisions : [];
      await tx.livingSeasonPack.update({
        where: { id: pack.id },
        data: {
          briefRevision,
          activeAt: null,
          characterBanner: jsonValue({
            revisions: [
              ...revisions.slice(-98),
              {
                revision: (revisions.at(-1)?.revision ?? 0) + 1,
                identityId: run.identityId,
                profileVersion,
                briefRevision,
                ...value.bannerCopy,
                crop: { x: 0.5, y: 0.5, zoom: 1.24 },
              },
            ],
          }),
        },
      });
      await tx.seasonOnboardingRun.update({
        where: { id: run.id },
        data: {
          draft: jsonValue(value),
          revision: { increment: 1 },
          profileVersion,
          intentVersion,
          briefRevision,
          stage: "SUMMARY",
          status: fresh.status === "PAUSED" ? "PAUSED" : "WAITING",
          completedTasks: ["research", "profile", "visual-intent", "summary"],
          error: null,
          question: null,
        },
      });
    },
    { timeout: 15000 },
  );
}
