import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: { aiCredential: { findUnique: vi.fn(), upsert: vi.fn() } } }));
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getAiCredential, saveAiCredential } from "./ai-credential.service";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BECOME_AI_KEY_SECRET", "fixture-only-encryption-secret-32-characters");
  vi.stubEnv("OPENAI_API_KEY", "fixture-shared-server-key");
});
afterEach(() => vi.unstubAllEnvs());
describe("account-owned Season credentials", () => {
  it("does not use a server key when accountOnly is requested", async () => {
    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue(null);
    expect(await getAiCredential("owner", "openai", { accountOnly: true })).toBeNull();
    expect(await getAiCredential("owner", "openai")).toBe("fixture-shared-server-key");
  });
  it("binds encrypted keys to the owning account and provider", async () => {
    await saveAiCredential("owner", "openai", "fixture-only-personal-key");
    const row = vi.mocked(prisma.aiCredential.upsert).mock.calls[0][0].create;
    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue(row as never);
    expect(await getAiCredential("owner", "openai", { accountOnly: true })).toBe("fixture-only-personal-key");
    await expect(getAiCredential("another-owner", "openai", { accountOnly: true })).rejects.toThrow(/cannot be unlocked/);
    await expect(getAiCredential("owner", "google", { accountOnly: true })).rejects.toThrow(/cannot be unlocked/);
  });
});
