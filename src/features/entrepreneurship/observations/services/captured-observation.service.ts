import type { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type { observationInputSchema } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
export async function saveCapturedObservations(
  tx: Prisma.TransactionClient,
  userId: string,
  observations: z.output<typeof observationInputSchema>[],
  context: {
    observedAt: Date;
    companyId: string | null;
    companySnapshot: string | null;
    nicheId?: string | null;
    nicheSnapshot?: string | null;
    interactionId?: string | null;
    interactionRevisionId?: string | null;
  },
) {
  for (const [index, item] of observations.entries()) {
    if (
      item.problemId &&
      !(await tx.problem.findFirst({
        where: { id: item.problemId, userId, archivedAt: null },
      }))
    )
      throw new BusinessError(
        `Observation ${index + 1}: choose an active problem you own.`,
      );
    const observation = await tx.observation.create({ data: { userId } });
    const observationRevision = await tx.observationRevision.create({
      data: {
        observationId: observation.id,
        userId,
        version: 1,
        kind: item.kind,
        wordingMode: item.wordingMode,
        statement: item.statement,
        observedAt: context.observedAt,
        companyId: context.companyId,
        companySnapshot: context.companySnapshot,
        nicheId: context.nicheId,
        nicheSnapshot: context.nicheSnapshot,
        sourceKind: context.interactionId
          ? "INTERACTION"
          : "DIRECT_OBSERVATION",
        interactionId: context.interactionId,
        interactionRevisionId: context.interactionRevisionId,
        sourceDescription: item.sourceDescription,
      },
    });
    if (item.problemId)
      await tx.problemEvidence.create({
        data: {
          userId,
          problemId: item.problemId,
          observationId: observation.id,
          observationRevisionId: observationRevision.id,
          stance: item.stance,
          explanation: item.explanation!,
        },
      });
  }
}
