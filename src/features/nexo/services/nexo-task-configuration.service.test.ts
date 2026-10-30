import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({
  prisma: { nexoSettings: { findUnique: vi.fn() } },
}));
vi.mock("./ai-credential.service", () => ({ getAiCredential: vi.fn() }));
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getAiCredential } from "./ai-credential.service";
import {
  ONBOARDING_TEXT_TASKS,
  requireNexoTaskConfiguration,
  resolveNexoTaskProfile,
} from "./nexo-task-configuration.service";
import {
  EMPTY_NEXO_SETTINGS,
  type NexoProfile,
} from "../schemas/nexo-settings.schema";

const profile: NexoProfile = {
  id: "sol",
  name: "Owner Sol",
  provider: "openai",
  model: "gpt-6.1-sol",
  reasoning: "medium",
  verbosity: "medium",
  timeoutSeconds: 180,
  maxOutputTokens: 16000,
};
const config = {
  ...EMPTY_NEXO_SETTINGS,
  profiles: [profile],
  assignments: ONBOARDING_TEXT_TASKS.map((taskId) => ({
    taskId,
    profileId: profile.id,
  })),
};
beforeEach(() => vi.resetAllMocks());
describe("explicit onboarding configuration", () => {
  it("requires an assignment even when a complete Sol profile exists", () => {
    expect(() =>
      resolveNexoTaskProfile(
        { ...config, assignments: [] },
        ONBOARDING_TEXT_TASKS[0],
      ),
    ).toThrow(/Assign.*Character research/);
  });
  it("never substitutes a default for a broken explicit assignment", () => {
    expect(() =>
      resolveNexoTaskProfile(
        { ...config, profiles: [] },
        ONBOARDING_TEXT_TASKS[0],
        profile,
      ),
    ).toThrow(/Assign/);
  });
  it("rejects research providers without the implemented web-search contract", () => {
    expect(() =>
      resolveNexoTaskProfile(
        { ...config, profiles: [{ ...profile, provider: "google" }] },
        ONBOARDING_TEXT_TASKS[0],
      ),
    ).toThrow(/OpenAI Responses web search/);
    expect(
      resolveNexoTaskProfile(
        { ...config, profiles: [{ ...profile, provider: "google" }] },
        ONBOARDING_TEXT_TASKS[1],
      ).provider,
    ).toBe("google");
  });
  it("checks documented Sol reasoning constraints", () => {
    expect(() =>
      resolveNexoTaskProfile(
        { ...config, profiles: [{ ...profile, reasoning: "minimal" }] },
        ONBOARDING_TEXT_TASKS[0],
      ),
    ).toThrow(/does not support/);
  });
  it("requires only the owner's credential, never a shared server key", async () => {
    vi.mocked(prisma.nexoSettings.findUnique).mockResolvedValue({
      config,
    } as never);
    vi.mocked(getAiCredential).mockResolvedValue(null);
    await expect(
      requireNexoTaskConfiguration("owner", ONBOARDING_TEXT_TASKS),
    ).rejects.toThrow(/this account/);
    expect(getAiCredential).toHaveBeenCalledWith("owner", "openai", {
      accountOnly: true,
    });
    vi.mocked(getAiCredential).mockResolvedValue("fixture-key");
    expect(
      (await requireNexoTaskConfiguration("owner", ONBOARDING_TEXT_TASKS)).map(
        (p) => p.id,
      ),
    ).toEqual(["sol", "sol", "sol"]);
  });
});
