import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { calendarDaySchema } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
const schema = z.object({
  title: z.string().trim().min(1).max(200),
  dueOn: z
    .union([calendarDaySchema, z.literal("")])
    .optional()
    .transform((v) => v || null),
});
export async function saveFollowUp(
  userId: string,
  target: { companyId?: string; interactionId?: string; offerId?: string },
  id: string | null,
  key: string,
  input: unknown,
) {
  const data = schema.parse(input);
  return captureOnce(userId, key, { ...data, target, id }, async (tx) => {
    if (Object.values(target).filter(Boolean).length !== 1)
      throw new BusinessError("Choose one follow-up context.");
    const parent = target.companyId
      ? await tx.company.findFirst({ where: { id: target.companyId, userId } })
      : target.interactionId
        ? await tx.interaction.findFirst({
            where: { id: target.interactionId, userId },
          })
        : await tx.offer.findFirst({ where: { id: target.offerId, userId } });
    if (!parent) throw new BusinessError("Follow-up context not found.");
    if (id) {
      const old = await tx.followUp.findFirst({ where: { id, userId } });
      if (
        !old ||
        old.companyId !== (target.companyId ?? null) ||
        old.interactionId !== (target.interactionId ?? null) ||
        old.offerId !== (target.offerId ?? null)
      )
        throw new BusinessError("This follow-up belongs to another context.");
      return (await tx.followUp.update({ where: { id }, data })).id;
    }
    return (await tx.followUp.create({ data: { userId, ...target, ...data } }))
      .id;
  });
}
export async function resolveFollowUp(
  userId: string,
  id: string,
  action: "COMPLETE" | "CANCEL" | "REOPEN",
) {
  z.enum(["COMPLETE", "CANCEL", "REOPEN"]).parse(action);
  return prisma.followUp.update({
    where: { id_userId: { id, userId } },
    data: {
      completedAt: action === "COMPLETE" ? new Date() : null,
      cancelledAt: action === "CANCEL" ? new Date() : null,
    },
  });
}
