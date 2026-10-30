import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  EMPTY_NEXO_SETTINGS,
  nexoSettingsSchema,
} from "@/features/nexo/schemas/nexo-settings.schema";
import { getAiCredentialStatus } from "@/features/nexo/services/ai-credential.service";
export async function getNexoSettings(userId: string) {
  const [saved, credentialStatus] = await Promise.all([
    prisma.nexoSettings.findUnique({ where: { userId } }),
    getAiCredentialStatus(userId),
  ]);
  return {
    version: saved?.version ?? 0,
    config: saved
      ? nexoSettingsSchema.parse(saved.config)
      : EMPTY_NEXO_SETTINGS,
    credentialAvailable: Object.values(credentialStatus).some((status) => status.available),
    credentialStatus,
  };
}
