import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";
import { Prisma } from "@/generated/prisma/client";
import { savePersonalSettings } from "./personal-settings.service";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyPassword: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/auth/config/auth.config", () => ({
  auth: {
    api: { getSession: mocks.getSession, verifyPassword: mocks.verifyPassword },
  },
}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({
  prisma: { user: { update: mocks.update } },
}));

const requestHeaders = new Headers({ cookie: "session=test" });
const input = {
  name: "New name",
  email: "current@example.test",
  currentPassword: "",
};

describe("personal settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({
      user: { id: "current-user", email: input.email },
    });
    mocks.verifyPassword.mockResolvedValue({ status: true });
    mocks.update.mockResolvedValue({ id: "current-user" });
  });

  it("requires a live persisted session before any write", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(savePersonalSettings(input, requestHeaders)).rejects.toThrow(
      "Sign in",
    );
    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("normalizes details and updates only the authenticated user", async () => {
    await savePersonalSettings(
      {
        ...input,
        name: "  New name  ",
        email: "CURRENT@example.test",
        userId: "someone-else",
      },
      requestHeaders,
    );
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "current-user", email: input.email },
      data: { name: "New name", email: input.email },
      select: { id: true },
    });
  });

  it.each([
    { name: " " },
    { email: "invalid" },
    { name: "a".repeat(121) },
    { currentPassword: "a".repeat(129) },
  ])("rejects invalid details %j before writing", async (invalid) => {
    await expect(
      savePersonalSettings({ ...input, ...invalid }, requestHeaders),
    ).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires the current password for a changed email", async () => {
    await expect(
      savePersonalSettings(
        { ...input, email: "new@example.test" },
        requestHeaders,
      ),
    ).rejects.toThrow("current password");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("leaves both details unchanged after an incorrect password", async () => {
    mocks.verifyPassword.mockRejectedValue(
      new APIError("BAD_REQUEST", {
        code: "INVALID_PASSWORD",
        message: "Invalid password",
      }),
    );
    await expect(
      savePersonalSettings(
        {
          ...input,
          email: "new@example.test",
          currentPassword: "wrong-password",
        },
        requestHeaders,
      ),
    ).rejects.toThrow("incorrect");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("saves name and email together and clears verification of the old email", async () => {
    await savePersonalSettings(
      {
        ...input,
        email: "new@example.test",
        currentPassword: "correct-password",
      },
      requestHeaders,
    );
    expect(mocks.verifyPassword).toHaveBeenCalledWith({
      headers: requestHeaders,
      body: { password: "correct-password" },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "current-user", email: input.email },
      data: {
        name: input.name,
        email: "new@example.test",
        emailVerified: false,
      },
      select: { id: true },
    });
  });

  it("returns a useful error for an email collision without a separate name write", async () => {
    mocks.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique email", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );
    await expect(
      savePersonalSettings(
        {
          ...input,
          email: "taken@example.test",
          currentPassword: "correct-password",
        },
        requestHeaders,
      ),
    ).rejects.toThrow("already in use");
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("rejects overlapping email changes instead of silently overwriting them", async () => {
    mocks.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Changed email", {
        code: "P2025",
        clientVersion: "7.10.0",
      }),
    );
    await expect(savePersonalSettings(input, requestHeaders)).rejects.toThrow(
      "changed elsewhere",
    );
  });
});
