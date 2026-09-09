import { DEFAULT_DOMAINS } from "@/features/domains/defaults/constants/domain.constants";
import { toDomainSlug } from "@/features/domains/identity/utils/domain.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { DEFAULT_FINANCE_ACTIVITIES } from "@/features/finance/sessions/constants/finance-activity.constants";

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
              financeActivityKind:
                domain.slug === "finance"
                  ? (DEFAULT_FINANCE_ACTIVITIES[name] ?? null)
                  : null,
              slug: toDomainSlug(name),
              sortOrder: activityIndex,
            })),
          },
        },
      }),
    ),
  );
}
