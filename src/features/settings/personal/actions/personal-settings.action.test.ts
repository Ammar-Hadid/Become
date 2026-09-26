import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePersonalSettingsAction } from "./personal-settings.action";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  setCookie: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "session=test" }),
  cookies: async () => ({
    getAll: () => [
      { name: "become.session_data" },
      { name: "become.session_data.0" },
      { name: "become.session_token" },
      { name: "unrelated" },
    ],
    set: mocks.setCookie,
  }),
}));
vi.mock("@/lib/auth/config/auth.config", () => ({
  auth: {
    $context: Promise.resolve({
      authCookies: {
        sessionData: {
          name: "become.session_data",
          attributes: { path: "/", secure: true },
        },
      },
    }),
  },
}));
vi.mock(
  "@/features/settings/personal/services/personal-settings.service",
  () => ({
    savePersonalSettings: mocks.save,
    PersonalSettingsError: class extends Error {},
  }),
);

describe("personal settings action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("clears only cached profile cookies and refreshes the shell after saving", async () => {
    const formData = new FormData();
    formData.set("name", "New name");
    formData.set("email", "new@example.test");
    formData.set("currentPassword", "current-password");
    formData.set("userId", "someone-else");
    expect(await savePersonalSettingsAction(formData)).toEqual({
      success: true,
    });
    expect(mocks.save).toHaveBeenCalledWith(
      {
        name: "New name",
        email: "new@example.test",
        currentPassword: "current-password",
      },
      expect.any(Headers),
    );
    expect(mocks.setCookie.mock.calls.map(([name]) => name)).toEqual([
      "become.session_data",
      "become.session_data.0",
    ]);
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "become.session_data",
      "",
      expect.objectContaining({ path: "/", secure: true, maxAge: 0 }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });

  it("keeps session cookies and cache unchanged after a failed save", async () => {
    mocks.save.mockRejectedValue(new Error("database unavailable"));
    expect(await savePersonalSettingsAction(new FormData())).toEqual({
      error: expect.stringContaining("Could not save"),
    });
    expect(mocks.setCookie).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
