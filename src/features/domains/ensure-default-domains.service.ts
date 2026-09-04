import { DEFAULT_DOMAINS } from "@/features/domains/domain.constants";
import { toDomainSlug } from "@/features/domains/domain.util";
import { prisma } from "@/lib/db/prisma.adapter";

export async function ensureDefaultDomains(userId: string) {
  await prisma.$transaction(
    DEFAULT_DOMAINS.map((domain, domainIndex) =>
      prisma.domain.upsert({
        where: { userId_slug: { userId, slug: domain.slug } },
        update: {},
        create: {
          userId,
          name: domain.name,
          slug: domain.slug,
          icon: domain.icon,
          analyticsColor: domain.analyticsColor,
          sortOrder: domainIndex,
          activityTypes: {
            create: domain.activities.map((name, activityIndex) => ({
              name,
              slug: toDomainSlug(name),
              sortOrder: activityIndex,
            })),
          },
        },
      }),
    ),
  );
}
