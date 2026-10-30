import { randomUUID } from "node:crypto";
import type { TestInfo } from "@playwright/test";
import {
  expect,
  test,
  type Locator,
  type Page,
} from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1440, height: 1000 },
] as const;

const SURFACES: Array<{
  href: string;
  label: string;
  ready: (page: Page) => Locator;
}> = [
  {
    href: "/",
    label: "home",
    ready: (page) =>
      page.getByRole("region", { name: "Dashboard lenses", exact: true }),
  },
  {
    href: "/engineering",
    label: "engineering",
    ready: (page) =>
      page.getByRole("heading", { name: "Build. Solve. Learn." }),
  },
  {
    href: "/finance",
    label: "finance",
    ready: (page) =>
      page.getByRole("heading", { name: "Your money, in focus", exact: true }),
  },
  {
    href: "/content",
    label: "content",
    ready: (page) =>
      page.getByRole("heading", { name: "Make the next one.", exact: true }),
  },
  {
    href: "/direction",
    label: "direction",
    ready: (page) =>
      page.getByRole("heading", {
        name: /^Season [1-4] · [0-9]{4}$/,
        exact: true,
      }),
  },
  {
    href: "/reviews",
    label: "reviews",
    ready: (page) =>
      page.getByRole("heading", { name: "See what the days added up to." }),
  },
  {
    href: "/sessions",
    label: "sessions",
    ready: (page) => page.getByRole("heading", { name: "Session history" }),
  },
  {
    href: "/settings/finance",
    label: "settings-finance",
    ready: (page) =>
      page.getByRole("heading", { name: "Finance", exact: true }),
  },
  {
    href: "/settings/nexo",
    label: "settings-nexo",
    ready: (page) =>
      page.getByRole("heading", {
        name: "AI connections",
        exact: true,
      }),
  },
];

async function createAccount(page: Page, viewport: (typeof VIEWPORTS)[number]) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByTestId("name-input")
    .fill("Motion Regression Person With A Deliberately Long Name");
  await page
    .getByTestId("email-input")
    .fill(`shared-motion-${viewport.label}-${randomUUID()}@example.test`);
  await page.getByTestId("password-input").fill("shared-motion-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(
    Math.max(dimensions.document, dimensions.body),
    `horizontal overflow at ${page.url()}`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(`${name}.png`, {
    path,
    contentType: "image/png",
  });
}

async function inspectAccountMenu(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof VIEWPORTS)[number],
) {
  const mobile = viewport.width < 1024;
  const navigationTrigger = page.getByRole("button", {
    name: "Open navigation",
  });
  if (mobile) await navigationTrigger.click();

  const accountTrigger = page.locator(
    mobile ? ".app-mobile-nav-profile:visible" : ".app-header-account:visible",
  );
  await accountTrigger.click();
  const menu = page.getByRole("menu", { name: "Account" });
  await expect(menu).toBeVisible();
  await attachScreenshot(
    page,
    testInfo,
    `${viewport.label}-shared-account-menu`,
  );
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(accountTrigger).toBeFocused();

  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(navigationTrigger).toBeFocused();
  }
}

async function inspectTimerDialog(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof VIEWPORTS)[number],
) {
  const trigger = page.locator('[data-testid="start-timer-trigger"]:visible');
  await trigger.click();
  const layer = page.locator(".dialog-backdrop");
  const close = page.getByRole("button", { name: "Close dialog" });
  await expect(layer).toHaveAttribute("data-state", "open");
  await expect(close).toBeFocused();
  await attachScreenshot(
    page,
    testInfo,
    `${viewport.label}-shared-timer-dialog`,
  );
  await close.click();
  await expect(layer).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

async function inspectContentDialog(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof VIEWPORTS)[number],
) {
  await page.goto("/content");
  const trigger = page.getByRole("button", {
    name: "Start content",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Start with the idea, not the paperwork.",
  });
  await expect(dialog).toBeVisible();
  await attachScreenshot(page, testInfo, `${viewport.label}-content-dialog`);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

async function inspectDirectionNavigation(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof VIEWPORTS)[number],
) {
  if (viewport.width >= 1024) return;
  await page.goto("/direction");
  const navigation = page.getByRole("navigation", {
    name: "Direction navigation",
  });
  const current = navigation.getByRole("link", {
    name: "This Season",
    exact: true,
  });
  await expect(current).toHaveAttribute("aria-current", "page");
  await current.focus();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Goals", exact: true }),
  ).toBeFocused();
  const last = navigation.getByRole("link", { name: "Reviews", exact: true });
  await last.focus();
  await expect(last).toBeFocused();
  const navBounds = await navigation.boundingBox();
  const linkBounds = await last.boundingBox();
  expect(linkBounds!.x).toBeGreaterThanOrEqual(navBounds!.x - 1);
  expect(linkBounds!.x + linkBounds!.width).toBeLessThanOrEqual(
    navBounds!.x + navBounds!.width + 1,
  );
  await assertNoPageOverflow(page);
  await attachScreenshot(
    page,
    testInfo,
    `${viewport.label}-direction-navigation`,
  );
}

async function inspectCots(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof VIEWPORTS)[number],
) {
  await page.goto("/direction");
  await page.getByRole("link", { name: "Open your season" }).click();
  await expect(
    page.getByRole("textbox", { name: "Character name", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find my character", exact: true }),
  ).toBeVisible();
  await assertNoPageOverflow(page);
  await attachScreenshot(page, testInfo, `${viewport.label}-cots-identity`);
}

for (const viewport of VIEWPORTS) {
  test(`${viewport.label} shared surfaces preserve layout, focus, and layer behavior`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await createAccount(page, viewport);

    const motionTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      // Production CSS minifies equivalent 150ms values to .15s.
      const milliseconds = (name: string) => {
        const value = style.getPropertyValue(name).trim();
        return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
      };
      return {
        response: milliseconds("--duration-response"),
        control: milliseconds("--duration-control"),
        content: milliseconds("--duration-content"),
        surface: milliseconds("--duration-surface"),
        emphasis: milliseconds("--duration-emphasis"),
        activeCycle: milliseconds("--duration-active-cycle"),
      };
    });
    expect(motionTokens).toEqual({
      response: 90,
      control: 150,
      content: 220,
      surface: 300,
      emphasis: 420,
      activeCycle: 1400,
    });

    await inspectAccountMenu(page, testInfo, viewport);
    await inspectTimerDialog(page, testInfo, viewport);

    for (const surface of SURFACES) {
      await page.goto(surface.href);
      await expect(surface.ready(page)).toBeVisible();
      await assertNoPageOverflow(page);
      await attachScreenshot(
        page,
        testInfo,
        `${viewport.label}-${surface.label}`,
      );
    }

    await inspectContentDialog(page, testInfo, viewport);
    await inspectDirectionNavigation(page, testInfo, viewport);
    await inspectCots(page, testInfo, viewport);
    expect(pageErrors).toEqual([]);
  });
}
