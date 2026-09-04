import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import type { BuiltInTechnologyDefinition } from "../constants/engineering-technology-catalog.constants";
import { synchronizeBuiltInTechnologies } from "./synchronize-built-in-technologies.service";

// Explicit local-database coverage; every fixture and mutation is rolled back.
describe.skipIf(process.env.RUN_REFERENCE_DATA_INTEGRATION !== "1")(
  "built-in technology synchronization (PostgreSQL)",
  () => {
    let prisma: PrismaClient;

    beforeAll(() => {
      const connectionString = process.env.DATABASE_URL;
      if (
        !connectionString ||
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(connectionString).hostname,
        )
      ) {
        throw new Error(
          "Reference-data integration tests require local PostgreSQL.",
        );
      }
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
    });

    afterAll(async () => prisma?.$disconnect());

    async function withRollback(
      run: (transaction: Prisma.TransactionClient) => Promise<void>,
    ) {
      const rollback = new Error("Rollback reference-data test fixtures");
      try {
        await prisma.$transaction(
          async (transaction) => {
            await run(transaction);
            throw rollback;
          },
          { isolationLevel: "Serializable", timeout: 15_000 },
        );
      } catch (error) {
        if (error !== rollback) throw error;
      }
    }

    it("converges metadata by stable ID, is idempotent, and preserves custom data and project links", async () => {
      await withRollback(async (transaction) => {
        const canonical = technology();
        const additional = technology();
        const unlisted = await transaction.technology.create({
          data: { ...technology(), isBuiltIn: true },
        });
        await transaction.technology.create({
          data: {
            ...canonical,
            name: "Old display name",
            slug: `old-${canonical.slug}`,
            category: "OTHER",
            iconKey: null,
            isBuiltIn: true,
          },
        });
        const user = await transaction.user.create({
          data: {
            name: "Reference-data test",
            email: `${randomUUID()}@example.test`,
          },
        });
        const custom = await transaction.technology.create({
          data: {
            userId: user.id,
            name: "Custom React",
            slug: canonical.slug,
            category: "OTHER",
            iconKey: null,
            isBuiltIn: false,
          },
        });
        const project = await transaction.engineeringProject.create({
          data: {
            userId: user.id,
            name: "Reference-data relationship test",
            technologies: {
              create: [canonical.id, custom.id, unlisted.id].map(
                (technologyId) => ({ technologyId }),
              ),
            },
          },
        });
        const linksBefore =
          await transaction.engineeringProjectTechnology.findMany({
            where: { engineeringProjectId: project.id },
            orderBy: { technologyId: "asc" },
          });

        const first = await synchronizeBuiltInTechnologies(transaction, [
          canonical,
          additional,
        ]);
        expect(first).toMatchObject({ created: 1, updated: 1, unchanged: 0 });
        expect(first.preservedUnlisted).toBeGreaterThan(0);
        expect(
          await transaction.technology.findUnique({
            where: { id: canonical.id },
          }),
        ).toMatchObject({ ...canonical, isBuiltIn: true, userId: null });
        expect(
          await transaction.technology.findUnique({ where: { id: custom.id } }),
        ).toEqual(custom);
        expect(
          await transaction.technology.findUnique({
            where: { id: unlisted.id },
          }),
        ).toEqual(unlisted);
        expect(
          await transaction.engineeringProjectTechnology.findMany({
            where: { engineeringProjectId: project.id },
            orderBy: { technologyId: "asc" },
          }),
        ).toEqual(linksBefore);

        const beforeSecondRun = await transaction.technology.findMany({
          orderBy: { id: "asc" },
        });
        const second = await synchronizeBuiltInTechnologies(transaction, [
          canonical,
          additional,
        ]);
        expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
        expect(
          await transaction.technology.findMany({ orderBy: { id: "asc" } }),
        ).toEqual(beforeSecondRun);
      });
    });

    it("refuses to adopt a custom technology even when its ID collides", async () => {
      await withRollback(async (transaction) => {
        const canonical = technology();
        const user = await transaction.user.create({
          data: {
            name: "Collision test",
            email: `${randomUUID()}@example.test`,
          },
        });
        const custom = await transaction.technology.create({
          data: { ...canonical, userId: user.id, isBuiltIn: false },
        });
        await expect(
          synchronizeBuiltInTechnologies(transaction, [
            technology(),
            canonical,
          ]),
        ).rejects.toThrow("not system-owned");
        expect(
          await transaction.technology.findUnique({ where: { id: custom.id } }),
        ).toEqual(custom);
      });
    });

    it("refuses duplicate built-in identities for an existing canonical slug", async () => {
      await withRollback(async (transaction) => {
        const existing = await transaction.technology.create({
          data: { ...technology(), isBuiltIn: true },
        });
        const conflicting = { ...technology(), slug: existing.slug };
        await expect(
          synchronizeBuiltInTechnologies(transaction, [conflicting]),
        ).rejects.toThrow("preserve its stable ID");
        expect(
          await transaction.technology.count({
            where: { slug: existing.slug, userId: null },
          }),
        ).toBe(1);
        expect(
          await transaction.technology.findUnique({
            where: { id: existing.id },
          }),
        ).toEqual(existing);
      });
    });
  },
);

function technology(): BuiltInTechnologyDefinition {
  const suffix = randomUUID();
  return {
    id: `builtin-tech-test-${suffix}`,
    name: "Canonical React",
    slug: `test-${suffix}`,
    category: "LIBRARY",
    iconKey: "react",
  };
}
