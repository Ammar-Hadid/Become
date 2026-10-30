import "./season-environment";
import { randomUUID } from "node:crypto";
import { heartbeatSeasonWorker } from "../src/features/seasons/living/onboarding/onboarding-health.service";
import { processSeasonOnboarding } from "../src/features/seasons/living/onboarding/onboarding-worker.service";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

let stopping = false;
const workerId = randomUUID();
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
let heartbeat: ReturnType<typeof setInterval> | undefined;
try {
  await heartbeatSeasonWorker(workerId);
  heartbeat = setInterval(() => {
    void heartbeatSeasonWorker(workerId).catch(() => {
      console.error(
        "Season worker heartbeat failed. Check database connectivity.",
      );
    });
  }, 10000);
  console.info(
    "Season onboarding worker ready; database heartbeat registered.",
  );
  do {
    try {
      await processSeasonOnboarding();
    } catch {
      console.error(
        "Season onboarding worker could not reach the database; it will reconnect.",
      );
      if (process.argv.includes("--once")) process.exitCode = 1;
    }
    if (process.argv.includes("--once")) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } while (!stopping);
} catch {
  console.error(
    "Season worker could not start. Check the app environment and database; apply migrations with pnpm db:deploy before restarting.",
  );
  process.exitCode = 1;
} finally {
  clearInterval(heartbeat);
  await prisma.seasonOnboardingWorker
    .deleteMany({ where: { id: workerId } })
    .catch(() => {});
  await prisma.$disconnect();
}
