import "server-only";
import type { Prisma, SeasonOnboardingRun } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { NexoError } from "@/features/nexo/types/nexo.types";
import {
  ONBOARDING_TEXT_TASKS,
  requireNexoTaskConfiguration,
} from "@/features/nexo/services/nexo-task-configuration.service";
import { getAiCredential } from "@/features/nexo/services/ai-credential.service";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";

export const WORKER_STALE_MS = 45_000;
export const QUEUE_GRACE_MS = 30_000;
export async function heartbeatSeasonWorker(id: string) {
  await prisma.seasonOnboardingWorker.upsert({
    where: { id },
    create: { id },
    update: { heartbeatAt: new Date() },
  });
}
export async function requireOnboardingConfiguration(
  userId: string,
  stage: string,
  db: Prisma.TransactionClient = prisma,
) {
  try {
    await requireNexoTaskConfiguration(
      userId,
      stage === "ASSEMBLING"
        ? ONBOARDING_TEXT_TASKS.slice(0, 2)
        : ["cots.image-prompt-writing"],
      db,
    );
    if (
      stage.startsWith("GENERATING_") &&
      !(await getAiCredential(userId, "google", { accountOnly: true }))
    )
      throw new NexoError(
        "Add your Google API key in Settings → Nexo for automatic artwork, or choose manual upload. An OpenAI text key does not enable Google image generation.",
      );
  } catch (error) {
    if (error instanceof NexoError) throw new DirectionError(error.message);
    throw error;
  }
}

/** Called by reads too: a stopped worker cannot be responsible for reporting its own death. */
export async function recoverOnboardingHealth(run: SeasonOnboardingRun) {
  const now = new Date();
  let error: string | null = null;
  if (run.status === "RUNNING" && (!run.leaseUntil || run.leaseUntil <= now))
    error =
      "The worker stopped during a call. Start pnpm worker:seasons (or pnpm dev:seasons), then use Retry unfinished work. Saved results and image reservations are kept; no call was automatically repeated.";
  if (run.status === "QUEUED") {
    try {
      await requireOnboardingConfiguration(run.userId, run.stage);
    } catch (cause) {
      if (cause instanceof DirectionError) error = cause.message;
      else throw cause;
    }
    if (!error && now.getTime() - run.updatedAt.getTime() >= QUEUE_GRACE_MS) {
      const live = await prisma.seasonOnboardingWorker.count({
        where: {
          heartbeatAt: { gt: new Date(now.getTime() - WORKER_STALE_MS) },
        },
      });
      if (!live)
        error =
          "The Season worker is not responding. Start pnpm worker:seasons (or pnpm dev:seasons) in the app directory, then use Retry unfinished work. Your saved Season is preserved.";
    }
  }
  if (!error) return run;
  // A claim, heartbeat or owner command that happened during the check wins.
  await prisma.seasonOnboardingRun.updateMany({
    where: {
      id: run.id,
      userId: run.userId,
      status: run.status,
      revision: run.revision,
      updatedAt: run.updatedAt,
    },
    data: {
      status: "FAILED",
      error,
      leaseToken: null,
      leaseUntil: null,
      revision: { increment: 1 },
    },
  });
  return prisma.seasonOnboardingRun.findUniqueOrThrow({
    where: { id: run.id },
  });
}
