import type { Prisma } from "@/generated/prisma/client";
import {
  BUILT_IN_ENGINEERING_TECHNOLOGIES,
  type BuiltInTechnologyDefinition,
} from "../constants/engineering-technology-catalog.constants";

/** Run inside a transaction: the seed entry point owns atomicity and isolation. */
export async function synchronizeBuiltInTechnologies(
  transaction: Prisma.TransactionClient,
  catalog: readonly BuiltInTechnologyDefinition[] = BUILT_IN_ENGINEERING_TECHNOLOGIES,
) {
  const ids = new Set(catalog.map((entry) => entry.id));
  const slugs = new Set(catalog.map((entry) => entry.slug));
  if (ids.size !== catalog.length || slugs.size !== catalog.length) {
    throw new Error(
      "Built-in technology catalog IDs and slugs must be unique.",
    );
  }

  const existing = await transaction.technology.findMany({
    where: {
      OR: [{ isBuiltIn: true, userId: null }, { id: { in: [...ids] } }],
    },
    select: {
      id: true,
      userId: true,
      isBuiltIn: true,
      name: true,
      slug: true,
      category: true,
      iconKey: true,
    },
  });
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  const builtInBySlug = new Map(
    existing
      .filter((entry) => entry.isBuiltIn && entry.userId === null)
      .map((entry) => [entry.slug, entry]),
  );

  // Never adopt an existing custom row or replace a differently identified
  // built-in. An identity conflict needs deliberate developer resolution.
  for (const entry of catalog) {
    const identified = byId.get(entry.id);
    if (identified && (!identified.isBuiltIn || identified.userId !== null)) {
      throw new Error(`Technology ID ${entry.id} is not system-owned.`);
    }
    const sameSlug = builtInBySlug.get(entry.slug);
    if (sameSlug && sameSlug.id !== entry.id) {
      throw new Error(
        `Built-in slug ${entry.slug} already belongs to ${sameSlug.id}; preserve its stable ID.`,
      );
    }
  }

  const result = {
    created: 0,
    updated: 0,
    unchanged: 0,
    preservedUnlisted: existing.filter(
      (entry) => entry.isBuiltIn && entry.userId === null && !ids.has(entry.id),
    ).length,
  };

  for (const entry of catalog) {
    const identified = byId.get(entry.id);
    const metadata = {
      name: entry.name,
      slug: entry.slug,
      category: entry.category,
      iconKey: entry.iconKey,
    };
    if (!identified) {
      await transaction.technology.create({
        data: { id: entry.id, ...metadata, isBuiltIn: true, userId: null },
      });
      result.created += 1;
    } else if (
      identified.name !== entry.name ||
      identified.slug !== entry.slug ||
      identified.category !== entry.category ||
      identified.iconKey !== entry.iconKey
    ) {
      const update = await transaction.technology.updateMany({
        where: { id: entry.id, isBuiltIn: true, userId: null },
        data: metadata,
      });
      if (update.count !== 1) {
        throw new Error(`System technology ${entry.id} changed during sync.`);
      }
      result.updated += 1;
    } else {
      result.unchanged += 1;
    }
  }

  return result;
}
