import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { nexoSettingsSchema } from "@/features/nexo/schemas/nexo-settings.schema";
import { NexoError } from "@/features/nexo/types/nexo.types";
import { nexoJson } from "@/features/nexo/utils/nexo-json.util";
export async function saveNexoSettings(
  userId: string,
  expectedVersion: number,
  input: unknown,
) {
  const config = nexoSettingsSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nexo:${userId}`},0))::text`;
    const current = await tx.nexoSettings.findUnique({ where: { userId } });
    if ((current?.version ?? 0) !== expectedVersion)
      throw new NexoError(
        "Settings changed in another tab. Reload before saving.",
      );
    const settings = await tx.nexoSettings.upsert({
      where: { userId },
      create: { userId, config: nexoJson(config) },
      update: { config: nexoJson(config), version: { increment: 1 } },
    });
    await tx.nexoSettingsRevision.create({
      data: { userId, version: settings.version, config: nexoJson(config) },
    });
    return settings;
  });
}
