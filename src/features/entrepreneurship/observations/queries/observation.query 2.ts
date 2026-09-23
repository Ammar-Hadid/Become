import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
export function getObservationDetail(userId: string, id: string) {
  return prisma.observation.findFirst({
    where: { id, userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: {
          audienceContext: audienceInclude,
          interactionRevision: {
            include: { audienceContext: audienceInclude },
          },
          evidence: { include: { problem: true } },
        },
      },
    },
  });
}
