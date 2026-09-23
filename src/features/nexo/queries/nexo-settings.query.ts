import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  EMPTY_NEXO_SETTINGS,
  nexoSettingsSchema,
} from "@/features/nexo/schemas/nexo-settings.schema";
export async function getNexoSettings(userId: string) {
  const saved = await prisma.nexoSettings.findUnique({ where: { userId } });
  return {
    version: saved?.version ?? 0,
    config: saved
      ? nexoSettingsSchema.parse(saved.config)
      : EMPTY_NEXO_SETTINGS,
    credentialAvailable: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };
}
