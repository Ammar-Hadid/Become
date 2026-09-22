import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test.describe("motion system", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = `motion-${randomUUID()}@example.test`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sign-in");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByTestId("name-input").fill("Motion Tester");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill("motion-test-password");
    await page.getByTestId("auth-submit").click();
    await deferAutomaticSeasonOpening(page);
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
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const openNavigation = page.getByRole("button", {
      name: "Open navigation",
    });
    await expect
      .poll(() =>
        openNavigation.evaluate((element) => {
          const style = getComputedStyle(element);
          return Math.max(
            ...style.transitionDuration
              .split(",")
              .map((duration) => Number.parseFloat(duration) || 0),
          );
        }),
      )
      .toBeLessThanOrEqual(0.001);

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

  test("presence cancellation and nested layers preserve the topmost interaction", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const openNavigation = page.getByRole("button", {
      name: "Open navigation",
    });
    const navigationLayer = page.locator(".mobile-navigation-layer");

    await openNavigation.click();
    const closeNavigation = page.getByRole("button", {
      name: "Close navigation",
    });
    await expect(closeNavigation).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.locator('[data-testid="user-identity"]:visible').click();
    const accountMenu = page.getByRole("menu", { name: "Account" });
    await expect(accountMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(accountMenu).toHaveCount(0);
    await expect(closeNavigation).toBeVisible();

    await page.evaluate(() =>
      window.dispatchEvent(new Event("become:start-timer")),
    );
    const timerLayer = page.locator(".dialog-backdrop");
    await expect(timerLayer).toHaveAttribute("data-state", "open");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(timerLayer).toHaveCount(0);
    await expect(closeNavigation).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await closeNavigation.click();
    await expect(navigationLayer).toHaveAttribute("data-state", "closed");
    await expect(navigationLayer).toHaveAttribute("inert", "");
    await openNavigation.click({ force: true });
    await expect(navigationLayer).toHaveAttribute("data-state", "open");
    await expect(navigationLayer).not.toHaveAttribute("inert", "");

    await page.evaluate(() =>
      window.dispatchEvent(new Event("become:start-timer")),
    );
    await expect(timerLayer).toHaveAttribute("data-state", "open");
    await closeNavigation.evaluate((element) =>
      (element as HTMLButtonElement).click(),
    );
    await expect(navigationLayer).toHaveCount(0);
    await expect(timerLayer).toHaveAttribute("data-state", "open");
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(timerLayer).toHaveCount(0);
    await expect(openNavigation).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");

    await openNavigation.click();
    await closeNavigation.click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(navigationLayer).toHaveCount(0);
    await expect(openNavigation).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
  });

  test("native record dialogs can reopen while their exit is pending", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/content");
    const trigger = page.getByRole("button", {
      name: "Start content",
      exact: true,
    });
    await trigger.click();
    const dialog = trigger.locator("xpath=following-sibling::dialog[1]");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement;
          return Boolean(
            active instanceof HTMLElement &&
              active.getClientRects().length > 0 &&
              !active.closest("details:not([open])"),
          );
        }),
      )
      .toBe(true);

    await dialog.getByRole("button", { name: /^Close / }).click();
    await expect(dialog).toHaveAttribute("data-state", "closed");
    await expect(dialog).toHaveAttribute("inert", "");
    await trigger.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(dialog).not.toHaveAttribute("inert", "");
    await page.waitForTimeout(220);
    await expect(dialog).toHaveAttribute("open", "");

    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
  });

  test("cancelled exits clean up and navigation works without View Transition support", async ({
    page,
  }) => {
    await page.context().addInitScript(() => {
      Object.defineProperty(Document.prototype, "startViewTransition", {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(() => typeof document.startViewTransition === "undefined"),
      )
      .toBe(true);

    const openNavigation = page.getByRole("button", {
      name: "Open navigation",
    });
    const navigationLayer = page.locator(".mobile-navigation-layer");
    await openNavigation.click();
    const closeNavigation = page.getByRole("button", {
      name: "Close navigation",
    });
    await closeNavigation.click();
    await expect(navigationLayer).toHaveAttribute("data-state", "closed");
    await navigationLayer.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true }))
        animation.cancel();
    });
    await expect(navigationLayer).toHaveCount(0);
    await expect(openNavigation).toBeFocused();

    await openNavigation.click();
    await expect(navigationLayer).toHaveAttribute("data-state", "open");
    await navigationLayer
      .getByRole("link", { name: "Engineering", exact: true })
      .click();
    await expect(page).toHaveURL("/engineering");
    await expect(
      page.getByRole("heading", { name: "Build. Solve. Learn." }),
    ).toBeVisible();
  });

  test("confirmed modal creation closes before its route transition", async ({
    page,
  }) => {
    await page.goto("/entrepreneurship");
    await page
      .getByRole("button", { name: "Start exploration", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Start exploration" });
    await dialog
      .getByRole("textbox", { name: "Exploration name", exact: true })
      .fill("Modal navigation regression");
    await dialog
      .getByRole("textbox", { name: "What are you exploring?" })
      .fill("Whether confirmed modal saves always reach their detail page.");
    await dialog
      .getByRole("button", { name: "Start exploring", exact: true })
      .click();

    await expect(page).toHaveURL(
      /\/entrepreneurship\/explorations\/[^/]+\/overview$/,
    );
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Modal navigation regression",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("confirmed engineering records are identified by id and clear the arrival URL", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/engineering/evidence/new");
    const title = `Confirmed record ${randomUUID()}`;
    await page.getByTestId("engineering-evidence-title").fill(title);
    await page.getByTestId("save-engineering-evidence").click();

    const record = page
      .locator("li[data-motion-arrival]")
      .filter({ hasText: title });
    await expect(record).toHaveAttribute("data-motion-arrival", "new");
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/engineering/evidence" &&
        !url.searchParams.has("created")
      );
    });
  });
});
