import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import type { StartSessionInput } from "@/features/sessions/schemas/session.schema";
export async function contentSessionValues(
  userId: string,
  domainSlug: string,
  activityName: string,
  input: StartSessionInput,
  tx: DirectionTx = prisma,
) {
  if (domainSlug !== "content" && (input.contentId || input.contentVariantId))
    throw new DirectionError("Content context requires the Content domain.");
  if (input.contentVariantId && !input.contentId)
    throw new DirectionError("Choose the creative work for this variant.");
  const content = input.contentId
    ? await tx.content.findFirst({
        where: { id: input.contentId, userId, archivedAt: null },
      })
    : null;
  if (input.contentId && !content)
    throw new DirectionError("Choose an active work you own.");
  const variant = input.contentVariantId
    ? await tx.contentVariant.findFirst({
        where: {
          id: input.contentVariantId,
          contentId: input.contentId!,
          userId,
          archivedAt: null,
        },
      })
    : null;
  if (input.contentVariantId && !variant)
    throw new DirectionError(
      "This variant does not belong to the selected work.",
    );
  return {
    contentId: content?.id ?? null,
    contentVariantId: variant?.id ?? null,
    contentTitleSnapshot: content?.title ?? null,
    contentVariantSnapshot: variant?.name ?? null,
    contentActivitySnapshot: domainSlug === "content" ? activityName : null,
  };
}
