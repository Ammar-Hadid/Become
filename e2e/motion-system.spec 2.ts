import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { expect, test } from "./utils/browser-test.util";

test.describe("motion system", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = `motion-${randomUUID()}@example.test`;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sign-in");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByTestId("name-input").fill("Motion Tester");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill("motion-test-password");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test.afterEach(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("reduced motion is immediate and mobile layers survive rapid input", async ({
    page,
  }) => {
    await expect
      .poll(() =>
        page.locator(".empty-focus-strip").evaluate((element) => {
          const style = getComputedStyle(element);
          return Math.max(
            ...style.transitionDuration
              .split(",")
              .map((duration) => Number.parseFloat(duration) || 0),
          );
        }),
      )
      .toBeLessThanOrEqual(0.001);

    const openNavigation = page.getByRole("button", {
      name: "Open navigation",
    });
    await openNavigation.focus();
    await openNavigation.click();
    const closeNavigation = page.getByRole("button", {
      name: "Close navigation",
    });
    await expect(closeNavigation).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(openNavigation).toBeFocused();

    await openNavigation.click();
    await closeNavigation.click();
    await openNavigation.click();
    await page.keyboard.press("Escape");
    await expect(openNavigation).toBeFocused();
    await expect(closeNavigation).toHaveCount(0);
  });
});
