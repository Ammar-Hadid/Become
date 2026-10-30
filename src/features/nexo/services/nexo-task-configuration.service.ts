import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ACTIVE_NEXO_TASKS } from "../constants/nexo-task.constants";
import {
  EMPTY_NEXO_SETTINGS,
  nexoSettingsSchema,
  type NexoProfile,
  type NexoSettingsConfig,
} from "../schemas/nexo-settings.schema";
import { NexoError } from "../types/nexo.types";
import { getAiCredential } from "./ai-credential.service";

export const ONBOARDING_TEXT_TASKS = [
  "cots.character-research",
  "cots.season-assembly",
  "cots.image-prompt-writing",
] as const;

export function resolveNexoTaskProfile(
  config: NexoSettingsConfig,
  taskId: string,
  defaultProfile?: NexoProfile,
) {
  const label =
    ACTIVE_NEXO_TASKS.find((task) => task.id === taskId)?.label ?? taskId;
  const assignment = config.assignments.find((item) => item.taskId === taskId);
  const profile = assignment
    ? config.profiles.find((item) => item.id === assignment.profileId)
    : defaultProfile;
  if (!profile)
    throw new NexoError(
      `Assign a model profile to ${label} in Settings → Nexo, save settings, then retry.`,
    );
  if (taskId === "cots.character-research" && profile.provider !== "openai")
    throw new NexoError(
      "Character research requires OpenAI Responses web search. Assign an OpenAI profile to Character research in Settings → Nexo; no other provider will be used automatically.",
    );
  if (
    profile.provider === "openai" &&
    /^gpt-6\.1-sol(?:-|$)/.test(profile.model) &&
    ["none", "minimal"].includes(profile.reasoning)
  )
    throw new NexoError(
      "GPT-6.1 Sol does not support none/minimal reasoning. Choose Provider default, low, medium, high or extra high in Settings → Nexo.",
    );
  return profile;
}

/** Local checks only. Account/model access is verified by the provider, never inferred from a name. */
export async function requireNexoTaskConfiguration(
  userId: string,
  tasks: readonly string[],
  db: Prisma.TransactionClient = prisma,
) {
  const saved = await db.nexoSettings.findUnique({ where: { userId } });
  const config = saved
    ? nexoSettingsSchema.parse(saved.config)
    : EMPTY_NEXO_SETTINGS;
  const profiles = tasks.map((task) => resolveNexoTaskProfile(config, task));
  for (const provider of new Set(profiles.map((profile) => profile.provider))) {
    if (!(await getAiCredential(userId, provider, { accountOnly: true })))
      throw new NexoError(
        `Add your ${provider} API key to this account in Settings → Nexo, then retry. Server or other-account credentials are not used for Season onboarding.`,
      );
  }
  return profiles;
}
