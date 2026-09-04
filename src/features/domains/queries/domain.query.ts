import { prisma } from "@/lib/db/adapters/prisma.adapter";

export function getDomainBySlug(userId: string, slug: string) {
  return prisma.domain.findFirst({
    where: { userId, slug },
    include: {
      activityTypes: {
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
