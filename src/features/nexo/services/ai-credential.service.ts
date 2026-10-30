import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getServerEnv } from "@/lib/config/server-environment.config";
import { NexoError } from "../types/nexo.types";

export const aiProviderSchema = z.enum(["openai", "zai", "moonshot", "google"]);
export type AiProvider = z.infer<typeof aiProviderSchema>;

function encryptionKey() {
  const secret =
    process.env.BECOME_AI_KEY_SECRET?.trim() ||
    getServerEnv().BETTER_AUTH_SECRET;
  return createHash("sha256")
    .update("become-ai-credentials-v1\0")
    .update(secret)
    .digest();
}

export async function saveAiCredential(
  userId: string,
  provider: AiProvider,
  rawKey: string,
) {
  const key = z.string().trim().min(16).max(512).parse(rawKey);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(`${userId}:${provider}`));
  const ciphertext = Buffer.concat([
    cipher.update(key, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  await prisma.aiCredential.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ciphertext, nonce, tag },
    update: { ciphertext, nonce, tag },
  });
}

export async function getAiCredential(
  userId: string,
  provider: AiProvider,
  options: { accountOnly?: boolean } = {},
) {
  const row = await prisma.aiCredential.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row)
    return !options.accountOnly && provider === "openai"
      ? process.env.OPENAI_API_KEY?.trim() || null
      : null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(row.nonce),
    );
    decipher.setAAD(Buffer.from(`${userId}:${provider}`));
    decipher.setAuthTag(Buffer.from(row.tag));
    return Buffer.concat([
      decipher.update(Buffer.from(row.ciphertext)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new NexoError(
      `The saved ${provider} key cannot be unlocked. Ensure the app and worker use the same credential secret, or save your key again in Settings → Nexo.`,
    );
  }
}

export async function getAiCredentialStatus(userId: string) {
  const rows = await prisma.aiCredential.findMany({
    where: { userId },
    select: { provider: true, updatedAt: true },
  });
  return Object.fromEntries(
    aiProviderSchema.options.map((provider) => [
      provider,
      {
        available:
          rows.some((row) => row.provider === provider) ||
          (provider === "openai" &&
            Boolean(process.env.OPENAI_API_KEY?.trim())),
        updatedAt:
          rows
            .find((row) => row.provider === provider)
            ?.updatedAt.toISOString() ?? null,
      },
    ]),
  ) as Record<AiProvider, { available: boolean; updatedAt: string | null }>;
}
