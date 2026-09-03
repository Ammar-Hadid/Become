import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_DOMAINS } from "../src/features/domains/domain.constants";
import { toDomainSlug } from "../src/features/domains/domain.util";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@become.local" },
  });
  if (!user) {
    console.log(
      "No demo user exists yet. Sign up in the app; domains are created automatically.",
    );
    return;
  }

  for (const [domainIndex, domain] of DEFAULT_DOMAINS.entries()) {
    await prisma.domain.upsert({
      where: { userId_slug: { userId: user.id, slug: domain.slug } },
      update: {},
      create: {
        userId: user.id,
        name: domain.name,
        slug: domain.slug,
        icon: domain.icon,
        analyticsColor: domain.analyticsColor,
        sortOrder: domainIndex,
        activityTypes: {
          create: domain.activities.map((name, sortOrder) => ({
            name,
            slug: toDomainSlug(name),
            sortOrder,
          })),
        },
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
