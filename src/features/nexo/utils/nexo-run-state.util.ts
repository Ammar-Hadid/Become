import { z } from "zod";

const timeoutSnapshotSchema = z.object({
  profile: z.object({ timeoutSeconds: z.number().min(15).max(180) }),
});

/** Operational timeout, separate from visual motion and presentation cadence. */
export function nexoRunDisplayState(
  run: {
    status: string;
    error: string | null;
    createdAt: Date;
    configSnapshot: unknown;
  },
  now = Date.now(),
) {
  const config = timeoutSnapshotSchema.safeParse(run.configSnapshot);
  const deadline =
    run.createdAt.getTime() +
    ((config.success ? config.data.profile.timeoutSeconds : 180) + 10) * 1000;
  return run.status === "PENDING" && now > deadline
    ? {
        status: "FAILED",
        error: "Generation was interrupted. Start a new refresh.",
      }
    : { status: run.status, error: run.error };
}
