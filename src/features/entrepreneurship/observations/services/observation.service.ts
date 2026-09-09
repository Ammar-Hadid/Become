import { z } from "zod";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { occurredDaySchema } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
const correction = z.object({
  expectedVersion: z.number().int().positive(),
  statement: z.string().trim().min(1).max(6000),
  sourceDescription: z.string().trim().min(1).max(6000),
  observedAt: occurredDaySchema,
  correctionReason: z.string().trim().min(1).max(2000),
  meaningUnchanged: z.boolean(),
});
export async function correctObservation(
  userId: string,
  id: string,
  key: string,
  input: unknown,
) {
  const data = correction.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const observation = await tx.observation.findFirst({
      where: { id, userId, voidedAt: null },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!observation || observation.version !== data.expectedVersion)
      throw new BusinessError(
        "This observation changed. Your edits are preserved; review its latest version first.",
      );
    const prior = observation.revisions[0];
    const materialChange =
      data.observedAt.getTime() !== prior.observedAt.getTime() ||
      (!data.meaningUnchanged &&
        (data.statement !== prior.statement ||
          data.sourceDescription !== prior.sourceDescription));
    const { id: revisionId, createdAt, ...values } = prior;
    void revisionId;
    void createdAt;
    await tx.observationRevision.create({
      data: {
        ...values,
        version: observation.version + 1,
        statement: data.statement,
        sourceDescription: data.sourceDescription,
        observedAt: data.observedAt,
        correctionReason: data.correctionReason,
        materialChange,
      },
    });
    await tx.observation.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    return id;
  });
}
export async function withdrawObservation(
  userId: string,
  id: string,
  key: string,
  reason: string,
) {
  if (!reason.trim()) throw new BusinessError("Explain the source correction.");
  return captureOnce(userId, key, { id, reason }, async (tx) => {
    await tx.observation.update({
      where: { id_userId: { id, userId } },
      data: { voidedAt: new Date(), voidReason: reason.trim().slice(0, 2000) },
    });
    return id;
  });
}
