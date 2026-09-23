import "server-only";
import { nexoRunDisplayState } from "@/features/nexo/utils/nexo-run-state.util";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getNexoSettings } from "@/features/nexo/queries/nexo-settings.query";
import { SYNTHESIS_TASK } from "@/features/nexo/constants/nexo-task.constants";
import {
  readSynthesisContext,
  readSynthesisSourceStates,
} from "./synthesis-context.query";
import {
  synthesisContextSchema,
  synthesisOutputSchema,
} from "../schemas/synthesis.schema";
import { synthesisFreshness } from "../utils/synthesis-context.util";
import type { SynthesisWorkspace } from "../types/synthesis.types";
const editionSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  output: synthesisOutputSchema,
  context: synthesisContextSchema,
  acceptedUnderstandingFingerprint: z.string(),
});
export async function getSynthesisWorkspace(
  userId: string,
  nicheId: string,
): Promise<SynthesisWorkspace> {
  const [settings, records] = await Promise.all([
    getNexoSettings(userId),
    prisma.$transaction(
      async (tx) => {
        const [current, edition, run, latestEdition] = await Promise.all([
          readSynthesisContext(tx, userId, nicheId),
          tx.explorationSnapshotEdition.findFirst({
            where: { userId, nicheId, synthesis: { not: Prisma.DbNull } },
            orderBy: { number: "desc" },
          }),
          tx.nexoRun.findFirst({
            where: { userId, scopeId: nicheId, taskId: SYNTHESIS_TASK },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          }),
          tx.explorationSnapshotEdition.findFirst({
            where: { userId, nicheId },
            orderBy: { number: "desc" },
            select: { sourceCursor: true },
          }),
        ]);
        return { current, edition, run, latestEdition };
      },
      { isolationLevel: "RepeatableRead", timeout: 15000 },
    ),
  ]);
  const parsed = records.edition
    ? editionSchema.safeParse(records.edition.synthesis)
    : null;
  const accepted = parsed?.success ? parsed.data : null;
  const context = records.run
    ? synthesisContextSchema.safeParse(records.run.input)
    : null;
  const output = records.run?.output
    ? synthesisOutputSchema.safeParse(records.run.output)
    : null;
  const sourceStates = accepted
    ? await readSynthesisSourceStates(
        prisma,
        userId,
        nicheId,
        accepted.context.sources,
      )
    : {};
  const proposal =
    records.run &&
    context?.success &&
    !["ACCEPTED", "DISCARDED"].includes(records.run.status)
      ? {
          id: records.run.id,
          ...nexoRunDisplayState(records.run),
          createdAt: records.run.createdAt.toISOString(),
          output: output?.success ? output.data : null,
          context: context.data,
        }
      : null;
  const publishedUnderstanding = z
    .object({ baseUnderstandingFingerprint: z.string() })
    .safeParse(records.latestEdition?.sourceCursor);
  return {
    configured: settings.config.assignments.some(
      (item) =>
        item.taskId === SYNTHESIS_TASK &&
        settings.config.profiles.some(
          (profile) => profile.id === item.profileId,
        ),
    ),
    credentialAvailable: settings.credentialAvailable,
    ...(accepted
      ? synthesisFreshness(
          {
            materialFingerprint: accepted.context.materialFingerprint,
            baseUnderstandingFingerprint: publishedUnderstanding.success
              ? publishedUnderstanding.data.baseUnderstandingFingerprint
              : accepted.acceptedUnderstandingFingerprint,
          },
          records.current,
        )
      : {
          refreshRecommended: false,
          unpublishedChanges: publishedUnderstanding.success
            ? records.current.baseUnderstandingFingerprint !==
              publishedUnderstanding.data.baseUnderstandingFingerprint
            : records.current.understanding.length > 0,
        }),
    latest:
      accepted && records.edition
        ? {
            sourceStates,
            editionId: records.edition.id,
            number: records.edition.number,
            publishedAt: records.edition.publishedAt.toISOString(),
            output: accepted.output,
            context: accepted.context,
          }
        : null,
    proposal,
  };
}
