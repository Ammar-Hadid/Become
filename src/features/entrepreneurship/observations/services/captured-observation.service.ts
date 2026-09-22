import { captureAudience } from "@/features/entrepreneurship/audiences/services/audience.service";
import type { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type { observationInputSchema } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
export async function saveCapturedObservations(
  tx: Prisma.TransactionClient,
  userId: string,
  observations: z.output<typeof observationInputSchema>[],
  context: {
    audienceContextId?: string | null;
    identityKind?: string;
    personId?: string | null;
    personSnapshot?: string | null;
    audienceLabel?: string | null;
    sampleSize?: number | null;
    sampleUnit?: string | null;
    observedAt: Date;
    companyId: string | null;
    companySnapshot: string | null;
    nicheId?: string | null;
    nicheSnapshot?: string | null;
    interactionId?: string | null;
    interactionRevisionId?: string | null;
    sourceMessageId?: string | null;
    sourceMessageRevisionId?: string | null;
    sourceKind?: "INTERACTION" | "MESSAGE" | "DIRECT_OBSERVATION";
  },
) {
  const saved: { observationId: string; observationRevisionId: string }[] = [];
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
    if (item.audience && !item.audienceReason)
      throw new BusinessError(
        "Explain the observation’s narrower audience attribution.",
      );
    const audience = item.audience
      ? await captureAudience(tx, userId, item.audience, context.nicheId)
      : {
          audienceContextId: context.audienceContextId,
          identityKind: context.identityKind ?? "UNSPECIFIED",
          personId: context.personId,
          personSnapshot: context.personSnapshot,
          audienceLabel: context.audienceLabel,
          sampleSize: context.sampleSize,
          sampleUnit: context.sampleUnit,
          companyId: context.companyId,
          companySnapshot: context.companySnapshot,
        };
    if (
      item.audience &&
      audience.identityKind === "UNSPECIFIED" &&
      !item.audience.personId &&
      !item.audience.personName &&
      !item.audience.companyId &&
      !item.audience.companyName
    )
      Object.assign(audience, {
        identityKind: context.identityKind ?? "UNSPECIFIED",
        personId: context.personId,
        personSnapshot: context.personSnapshot,
        companyId: context.companyId,
        companySnapshot: context.companySnapshot,
        audienceLabel: context.audienceLabel,
        sampleSize: context.sampleSize,
        sampleUnit: context.sampleUnit,
      });
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
        ...audience,
        nicheId: context.nicheId,
        nicheSnapshot: context.nicheSnapshot,
        sourceKind:
          context.sourceKind ??
          (context.interactionId ? "INTERACTION" : "DIRECT_OBSERVATION"),
        interactionId: context.interactionId,
        interactionRevisionId: context.interactionRevisionId,
        sourceMessageId: context.sourceMessageId,
        sourceMessageRevisionId: context.sourceMessageRevisionId,
        sourceDescription: item.audienceReason
          ? `${item.sourceDescription}\nAudience attribution: ${item.audienceReason}`
          : item.sourceDescription,
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
    saved.push({
      observationId: observation.id,
      observationRevisionId: observationRevision.id,
    });
  }
  return saved;
}
