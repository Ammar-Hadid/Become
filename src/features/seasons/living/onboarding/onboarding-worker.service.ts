import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { jsonValue } from "@/features/direction/services/direction-mutation.service";
import { requiredSeason } from "../services/living-season-pack.service";
import {
  generateLivingArtwork,
  generateLivingBanner,
} from "../services/living-image-generation.service";
import {
  assembleOnboardingDraft,
  researchOnboardingCharacter,
  researchSchema,
} from "./onboarding-research.service";
import {
  preparationEstimate,
  streamingSummaryParagraphs,
} from "./onboarding-stream.util";
import type { PreparationProgress } from "./onboarding.schema";
import { pendingImagesSchema } from "./onboarding.schema";
import { saveOnboardingDraft } from "./onboarding.service";
import { ensureSeasonImagePrompts } from "../image-direction/services/image-prompt-writing.service";
import { processLivingMediaCleanup } from "./scene-attempt.service";
import { requireOnboardingConfiguration } from "./onboarding-health.service";

/** PostgreSQL owns the lease, so two workers cannot dispatch the same run. No provider retries. */
export async function processSeasonOnboarding() {
  await processLivingMediaCleanup();
  const leaseToken = randomUUID();
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('season-onboarding-worker',0))::text`;
    await tx.seasonOnboardingRun.updateMany({
      where: { status: "RUNNING", leaseUntil: { lt: new Date() } },
      data: {
        status: "FAILED",
        error:
          "The worker stopped during a call. Reservations are kept; review unfinished work before authorizing a retry.",
        leaseToken: null,
        leaseUntil: null,
        revision: { increment: 1 },
      },
    });
    // ponytail: one claimed run globally; increase throughput only if this becomes a multi-user app.
    if (
      await tx.seasonOnboardingRun.count({
        where: { leaseToken: { not: null }, leaseUntil: { gt: new Date() } },
      })
    )
      return null;
    const run = await tx.seasonOnboardingRun.findFirst({
      where: { status: "QUEUED" },
      orderBy: { updatedAt: "asc" },
      include: { pack: { include: { season: true } } },
    });
    if (!run) return null;
    await tx.seasonOnboardingRun.update({
      where: { id: run.id },
      data: {
        status: "RUNNING",
        leaseToken,
        leaseUntil: new Date(Date.now() + 300000),
      },
    });
    return run;
  });
  if (!claimed) return false;
  const run = claimed;
  const { year, quarter } = run.pack.season;
  const ownedLease = { id: run.id, leaseToken, status: "RUNNING" };
  const finishingLease = {
    id: run.id,
    leaseToken,
    status: { in: ["RUNNING", "PAUSED"] },
  };
  const heartbeat = setInterval(() => {
    void prisma.seasonOnboardingRun
      .updateMany({
        where: finishingLease,
        data: { leaseUntil: new Date(Date.now() + 300000) },
      })
      .catch(() => {});
  }, 15000);
  try {
    await requireOnboardingConfiguration(run.userId, run.stage);
    const { identity } = await requiredSeason(run.userId, year, quarter);
    if (
      identity.row.id !== run.identityId ||
      identity.row.revision !== run.identityRevision ||
      run.pack.briefRevision !== run.briefRevision
    )
      throw new Error(
        "The selected character or world changed. Review it before continuing.",
      );
    if (run.stage === "ASSEMBLING") {
      let research = researchSchema.safeParse(run.research);
      const needsResearch =
        !research.success ||
        (!research.data.sources.length && !research.data.question);
      const recent = await prisma.nexoRun.findMany({
        where: {
          userId: run.userId,
          status: "READY",
          taskId: { in: ["cots.character-research", "cots.season-assembly"] },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { taskId: true, usage: true },
      });
      const timings = (task: string) =>
        recent
          .filter((r) => r.taskId === task)
          .map((r) => {
            const usage = r.usage as { latencyMs?: number } | null;
            return typeof usage?.latencyMs === "number" ? usage.latencyMs : 0;
          });
      const progress: PreparationProgress = {
        attempt: leaseToken,
        startedAt: new Date().toISOString(),
        phase: needsResearch ? "research" : "writing",
        paragraphs: [],
        estimate: preparationEstimate(
          timings("cots.character-research"),
          timings("cots.season-assembly"),
          needsResearch,
        ),
      };
      const saveProgress = async () => {
        await prisma.seasonOnboardingRun.updateMany({
          where: finishingLease,
          data: { preparationProgress: jsonValue(progress) },
        });
      };
      await saveProgress();
      if (needsResearch) {
        const evidence = await researchOnboardingCharacter({
          userId: run.userId,
          runId: run.id,
          revision: run.revision,
          identity: identity.view,
          setting: run.pack.setting,
          visualDirection: run.pack.visualBrief,
          correction: run.correction,
        });
        if (
          !(
            await prisma.seasonOnboardingRun.updateMany({
              where: finishingLease,
              data: {
                research: jsonValue(evidence),
                completedTasks: ["research"],
              },
            })
          ).count
        )
          return true;
        research = { success: true, data: evidence };
      }
      if (!(await prisma.seasonOnboardingRun.count({ where: ownedLease })))
        return true;
      if (!research.success)
        throw new Error("Research did not produce a valid result.");
      if (research.data.question) {
        await prisma.seasonOnboardingRun.updateMany({
          where: ownedLease,
          data: {
            stage: "NEEDS_INPUT",
            status: "WAITING",
            revision: { increment: 1 },
            question: research.data.question,
          },
        });
        return true;
      }
      progress.phase = "writing";
      await saveProgress();
      const result = await assembleOnboardingDraft({
        userId: run.userId,
        runId: run.id,
        revision: run.revision,
        identity: identity.view,
        setting: run.pack.setting,
        visualDirection: run.pack.visualBrief,
        correction: run.correction,
        research: research.data,
        existingDraft: run.draft,
        onTextSnapshot: async (snapshot) => {
          const paragraphs = streamingSummaryParagraphs(snapshot);
          // Write only newly completed paragraphs, not every token. A preview
          // persistence outage must not discard an otherwise valid paid result.
          if (paragraphs.length <= progress.paragraphs.length) return;
          progress.paragraphs = paragraphs;
          await saveProgress().catch(() => {});
        },
      });
      progress.phase = "checking";
      await saveProgress();
      if (!result.draft)
        await prisma.$transaction(async (tx) => {
          await tx.seasonOnboardingRun.updateMany({
            where: finishingLease,
            data: {
              stage: "NEEDS_INPUT",
              revision: { increment: 1 },
              question:
                result.question ??
                "What additional source detail should guide this character?",
            },
          });
          await tx.seasonOnboardingRun.updateMany({
            where: ownedLease,
            data: { status: "WAITING" },
          });
        });
      else await saveOnboardingDraft(run.id, leaseToken, result.draft);
    } else if (
      [
        "GENERATING_BANNER",
        "GENERATING_PORTRAIT",
        "GENERATING_SCENES",
      ].includes(run.stage)
    ) {
      const pending = pendingImagesSchema
        .parse(run.pendingImages)
        .filter(
          (image) =>
            run.stage !== "GENERATING_BANNER" || image.kind !== "avatar",
        );
      if (pending.length)
        await ensureSeasonImagePrompts(
          run.userId,
          year,
          quarter,
          run.stage === "GENERATING_SCENES"
            ? "scene"
            : run.stage === "GENERATING_PORTRAIT"
              ? "portrait"
              : "banner-desktop",
          run.chapter,
        );
      const currentLease = await prisma.seasonOnboardingRun.findFirst({
        where: ownedLease,
        select: { id: true },
      });
      if (!currentLease) return true;
      // Desktop banner first; phone and portrait can then share that draft as continuity.
      const batch =
        pending[0]?.kind === "desktop"
          ? pending.slice(0, 1)
          : pending.slice(0, 2);
      const results = await Promise.allSettled(
        batch.map((image) =>
          image.kind === "scene" && image.slot
            ? generateLivingArtwork(run.userId, {
                year,
                quarter,
                slot: image.slot,
                resolution: "2K",
                operationKey: image.key,
                sceneAttemptId: image.sceneAttemptId,
                onboardingLeaseToken: leaseToken,
              })
            : generateLivingBanner(run.userId, {
                year,
                quarter,
                bannerKind: image.kind,
                resolution: "2K",
                operationKey: image.key,
                onboardingLeaseToken: leaseToken,
              }),
        ),
      );
      const completed = batch.filter(
        (_, index) => results[index].status === "fulfilled",
      );
      const remaining = pending.filter(
        (image) => !completed.some((c) => c.key === image.key),
      );
      const failure = results.find((r) => r.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      await prisma.$transaction(async (tx) => {
        await tx.seasonOnboardingRun.updateMany({
          where: finishingLease,
          data: { pendingImages: jsonValue(remaining) },
        });
        await tx.seasonOnboardingRun.updateMany({
          where: ownedLease,
          data: {
            pendingImages: jsonValue(remaining),
            revision: { increment: 1 },
            status: remaining.length ? "QUEUED" : "WAITING",
            stage: remaining.length
              ? run.stage
              : run.stage === "GENERATING_BANNER"
                ? "BANNER"
                : run.stage === "GENERATING_PORTRAIT"
                  ? "PORTRAIT"
                  : "SCENES",
          },
        });
        if (!remaining.length)
          await tx.seasonOnboardingRun.updateMany({
            where: { ...finishingLease, status: "PAUSED" },
            data: {
              stage:
                run.stage === "GENERATING_BANNER"
                  ? "BANNER"
                  : run.stage === "GENERATING_PORTRAIT"
                    ? "PORTRAIT"
                    : "SCENES",
              revision: { increment: 1 },
            },
          });
      });
    } else
      throw new Error("This step needs review before the worker can continue.");
  } catch (error) {
    await prisma.seasonOnboardingRun.updateMany({
      where: finishingLease,
      data: {
        status: "FAILED",
        revision: { increment: 1 },
        error:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Season preparation failed. Saved work is preserved.",
      },
    });
  } finally {
    clearInterval(heartbeat);
    await prisma.seasonOnboardingRun.updateMany({
      where: { id: run.id, leaseToken },
      data: { leaseToken: null, leaseUntil: null },
    });
  }
  return true;
}
