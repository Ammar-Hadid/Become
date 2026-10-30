import "./season-environment";
import OpenAI from "openai";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { getAiCredential } from "../src/features/nexo/services/ai-credential.service";
import {
  ONBOARDING_TEXT_TASKS,
  resolveNexoTaskProfile,
} from "../src/features/nexo/services/nexo-task-configuration.service";
import {
  EMPTY_NEXO_SETTINGS,
  nexoSettingsSchema,
} from "../src/features/nexo/schemas/nexo-settings.schema";
import { nexoProviderError } from "../src/features/nexo/utils/nexo-provider-error.util";
import { NexoError } from "../src/features/nexo/types/nexo.types";
import { livingImageModel } from "../src/features/seasons/living/adapters/google-image.adapter";
import { WORKER_STALE_MS } from "../src/features/seasons/living/onboarding/onboarding-health.service";

// Read-only metadata checks. No prompt, research, image generation, or credential output.
const email = process.argv.find((arg) => arg.startsWith("--email="))?.slice(8);
try {
  if (!email)
    throw new NexoError("Usage: pnpm check:seasons --email=your-account-email");
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new NexoError("No matching local Become account.");
  const saved = await prisma.nexoSettings.findUnique({
    where: { userId: user.id },
  });
  const config = saved
    ? nexoSettingsSchema.parse(saved.config)
    : EMPTY_NEXO_SETTINGS;
  const verified = new Set<string>();
  for (const task of ONBOARDING_TEXT_TASKS) {
    let profile;
    try {
      profile = resolveNexoTaskProfile(config, task);
      const apiKey = await getAiCredential(user.id, profile.provider, {
        accountOnly: true,
      });
      if (!apiKey)
        throw new NexoError(
          `Save your ${profile.provider} key in Settings → Nexo.`,
        );
      const key = `${profile.provider}:${profile.model}`;
      if (!verified.has(key)) {
        if (profile.provider === "openai") {
          const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 15000 });
          const model = await client.models.retrieve(profile.model);
          if (model.id !== profile.model)
            throw new NexoError(
              "Provider returned a different model ID; inspect the selected profile.",
            );
        } else if (profile.provider === "google") {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(profile.model)}`,
            {
              headers: { "x-goog-api-key": apiKey },
              signal: AbortSignal.timeout(15000),
            },
          );
          if (!response.ok) throw { status: response.status };
        } else
          throw new NexoError(
            "This checker has no metadata probe for the selected provider. No substitute provider was contacted.",
          );
        verified.add(key);
      }
      console.info(
        `${task}: ${profile.name} · ${profile.provider}/${profile.model} · account model access verified (metadata only).`,
      );
    } catch (error) {
      process.exitCode = 1;
      console.info(
        `${task}: ${error instanceof NexoError ? error.message : nexoProviderError(error, profile?.provider ?? "selected", profile?.model ?? "selected")}`,
      );
    }
  }
  const googleKey = await getAiCredential(user.id, "google", {
    accountOnly: true,
  });
  if (googleKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${livingImageModel}`,
        {
          headers: { "x-goog-api-key": googleKey },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw { status: response.status };
      const model = (await response.json()) as {
        supportedGenerationMethods?: string[];
      };
      if (!model.supportedGenerationMethods?.includes("generateContent"))
        throw new NexoError(
          "The image model does not advertise generateContent support.",
        );
      console.info(
        `Automatic artwork: google/${livingImageModel} metadata verified. Image generation and visual quality remain untested.`,
      );
    } catch (error) {
      process.exitCode = 1;
      console.info(
        error instanceof NexoError
          ? error.message
          : nexoProviderError(error, "google", livingImageModel),
      );
    }
  } else
    console.info(
      "Automatic artwork: no Google key on this account. Manual upload remains available.",
    );
  const live = await prisma.seasonOnboardingWorker.count({
    where: { heartbeatAt: { gt: new Date(Date.now() - WORKER_STALE_MS) } },
  });
  console.info(
    live
      ? "Worker: heartbeat present."
      : "Worker: absent. Start pnpm worker:seasons or pnpm dev:seasons.",
  );
  if (!live) process.exitCode = 1;
  console.info(
    "No generation was requested. Metadata access does not prove Responses/tool/schema execution or a complete Season.",
  );
} catch (error) {
  console.error(
    error instanceof NexoError
      ? error.message
      : "Could not check setup. Verify environment, database access and migrations.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
