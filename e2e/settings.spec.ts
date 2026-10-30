import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test("personal settings persist, protect email changes, and share top navigation", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  )
    throw new Error("Settings browser fixtures require local PostgreSQL.");

  const originalEmail = `settings-e2e-${randomUUID()}@example.test`;
  const newEmail = `settings-updated-${randomUUID()}@example.test`;
  const takenEmail = `settings-taken-${randomUUID()}@example.test`;
  const password = "settings-test-password";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await context.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: { name: "Settings Tester", email: originalEmail, password },
  });
  expect(response.ok()).toBe(true);
  const { user } = await response.json();
  const collision = await prisma.user.create({
    data: { name: "Collision fixture", email: takenEmail },
  });
  try {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/application$/);
    await expect(
      page.getByRole("heading", {
        name: "Application preferences",
        exact: true,
      }),
    ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Settings sections",
    });
    await expect(navigation.getByRole("link")).toHaveText([
      "Application",
      "Personal",
      "Finance",
      "Nexo",
    ]);
    await expect(
      navigation.getByRole("link", { name: "Application", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await navigation
      .getByRole("link", { name: "Personal", exact: true })
      .click();
    await expect(page).toHaveURL(/\/settings\/personal$/);
    await expect(
      page.getByRole("heading", { name: "Profile and account", exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Personal", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByText("Money rules and records", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("AI models and limits", { exact: true }),
    ).toHaveCount(0);
    const tabs = await navigation.getByRole("link").all();
    const positions = await Promise.all(tabs.map((link) => link.boundingBox()));
    expect(
      new Set(positions.map((position) => Math.round(position!.y))).size,
    ).toBe(1);
    const nameField = page.getByLabel("Name", { exact: true });
    const emailField = page.getByLabel("Email", { exact: true });
    const save = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    await expect(nameField).toHaveValue("Settings Tester");
    await expect(emailField).toHaveValue(originalEmail);
    await expect(save).toBeDisabled();
    await page.screenshot({
      path: `/tmp/become-settings-${testInfo.project.name}.png`,
      fullPage: true,
    });

    await nameField.fill("Renamed Tester");
    await save.click();
    await expect(save).toBeDisabled();
    await expect
      .poll(
        async () =>
          (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
            .name,
      )
      .toBe("Renamed Tester");
    await expect(page.locator(".app-header-account-name").first()).toHaveText(
      "Renamed Tester",
    );
    await page.reload();
    await expect(nameField).toHaveValue("Renamed Tester");

    await nameField.fill("Unsaved name");
    await navigation
      .getByRole("link", { name: "Finance", exact: true })
      .click({ noWaitAfter: true });
    // The shared guard cancels navigation when Playwright dismisses the confirmation.
    await expect(page).toHaveURL(/\/settings\/personal$/);
    await expect(nameField).toHaveValue("Unsaved name");
    await page
      .getByRole("button", { name: "Reset changes", exact: true })
      .click();
    await expect(nameField).toHaveValue("Renamed Tester");

    await nameField.fill("Blocked name");
    await emailField.fill(newEmail);
    const currentPassword = page.getByLabel("Current password", {
      exact: true,
    });
    await currentPassword.fill("wrong-password");
    await save.click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "incorrect",
    );
    await expect(nameField).toHaveValue("Blocked name");
    await expect(emailField).toHaveValue(newEmail);
    let persisted = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(persisted.name).toBe("Renamed Tester");
    expect(persisted.email).toBe(originalEmail);

    await emailField.fill(takenEmail);
    await currentPassword.fill(password);
    await save.click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "already in use",
    );
    persisted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(persisted.name).toBe("Renamed Tester");
    expect(persisted.email).toBe(originalEmail);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    await nameField.fill("Updated Tester");
    await emailField.fill(newEmail);
    await currentPassword.fill(password);
    await save.click();
    await expect(save).toBeDisabled();
    await expect(currentPassword).toHaveCount(0);
    await expect(page.locator(".app-header-account-name").first()).toHaveText(
      "Updated Tester",
    );
    await page.reload();
    await expect(nameField).toHaveValue("Updated Tester");
    await expect(emailField).toHaveValue(newEmail);
    persisted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(persisted.emailVerified).toBe(false);
    const session = await context.request.get("/api/auth/get-session");
    expect((await session.json()).user).toMatchObject({
      id: user.id,
      name: "Updated Tester",
      email: newEmail,
    });

    for (const section of ["Finance", "Nexo"]) {
      await navigation
        .getByRole("link", { name: section, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/settings/${section.toLowerCase()}$`),
      );
      await expect(
        navigation.getByRole("link", { name: section, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      await page.screenshot({
        path: `/tmp/become-settings-${section.toLowerCase()}-${testInfo.project.name}.png`,
        fullPage: true,
      });
    }
    const logout = await context.request.post("/api/auth/sign-out", {
      headers: { origin: baseURL! },
      data: {},
    });
    expect(logout.ok(), logout.ok() ? undefined : await logout.text()).toBe(
      true,
    );
    const login = await context.request.post("/api/auth/sign-in/email", {
      headers: { origin: baseURL! },
      data: { email: newEmail, password },
    });
    expect(login.ok(), login.ok() ? undefined : await login.text()).toBe(true);
    await page.goto("/settings/personal");
    await expect(emailField).toHaveValue(newEmail);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (testInfo.project.name === "chromium") {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(nameField).toBeVisible();
        await expect(emailField).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `/tmp/become-settings-${width}.png`,
          fullPage: true,
        });
      }
      await navigation
        .getByRole("link", { name: "Personal", exact: true })
        .focus();
      await page.keyboard.press("Tab");
      await expect(
        navigation.getByRole("link", { name: "Finance", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/settings\/finance$/);
    }
    expect(errors).toEqual([]);
  } finally {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (current) await deleteDisposableBrowserUser(user.id, current.email);
    await prisma.user.delete({ where: { id: collision.id } });
  }
});
