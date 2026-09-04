import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_DOMAINS } from "../src/features/domains/defaults/constants/domain.constants";
import { toDomainSlug } from "../src/features/domains/identity/utils/domain.util";
import { synchronizeBuiltInTechnologies } from "../src/features/engineering/technologies/services/synchronize-built-in-technologies.service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const referenceData = await prisma.$transaction(
    (transaction) => synchronizeBuiltInTechnologies(transaction),
    { isolationLevel: "Serializable", timeout: 30_000 },
  );
  console.log("Built-in Engineering technologies:", referenceData);
  if (process.argv.includes("--reference-data-only")) return;

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

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
