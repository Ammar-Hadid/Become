import { randomUUID } from "node:crypto";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByTestId("name-input")
    .fill("Disposable entrepreneurship journey QA");
  await page
    .getByTestId("email-input")
    .fill(`entrepreneurship-journey-${randomUUID()}@example.com`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-entrepreneurship-journey");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

async function startExploration(page: Page) {
  await page.goto("/entrepreneurship");
  await page
    .getByRole("button", { name: "Start exploration", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Exploration name", exact: true })
    .fill("Interview follow-through");
  await page
    .getByRole("textbox", { name: "What are you exploring?" })
    .fill("How independent researchers turn replies into useful learning.");
  await page
    .getByRole("button", { name: "Start exploring", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrepreneurship\/explorations\/[^/]+$/);
  const pathname = new URL(page.url()).pathname;
  return {
    pathname,
    nicheId: pathname.split("/").at(-1)!,
  };
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function settleForScreenshot(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test("the exploration journey stays scoped, legible and responsive", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await signUp(page);
  const exploration = await startExploration(page);
  const snapshotHref = `${exploration.pathname}/snapshot`;
  await page.goto(snapshotHref);

  const journey = page.getByRole("navigation", {
    name: "Exploration journey",
  });
  await expect(journey).toBeVisible();
  for (const stage of ["Snapshot", "Scope", "Reach", "Learn", "Decide", "Test"])
    await expect(
      journey.getByRole("link", { name: new RegExp(`^${stage}`) }),
    ).toBeVisible();

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(snapshotHref);
    await expect(
      page.getByRole("heading", {
        name: "Current understanding from real conversations",
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await settleForScreenshot(page);
    await page.screenshot({
      path: testInfo.outputPath(`snapshot-${viewport.width}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const snapshotLink = journey.getByRole("link", { name: /^Snapshot/ });
  await snapshotLink.focus();
  await snapshotLink.press("Tab");
  await expect(journey.getByRole("link", { name: /^Scope/ })).toBeFocused();

  const stageRoutes = [
    ["scope", "Who are you learning from?"],
    ["reach", "Turn a useful target into a real exchange."],
    ["learn", "Keep the exchange before you decide what it means."],
    ["learn/conversations", "Preserve the two-sided exchange."],
    ["learn/guides", "Prepare questions without scripting the person."],
    ["decide", "Hold the question open."],
    ["test", "Something worth saying yes to."],
  ] as const;
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [route, heading] of stageRoutes) {
      await page.goto(`${exploration.pathname}/${route}`);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await settleForScreenshot(page);
      await page.screenshot({
        path: testInfo.outputPath(
          `${route.replaceAll("/", "-")}-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }
  }

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${exploration.pathname}/learn/conversations`);
    await expect(
      page.getByRole("heading", {
        name: "Preserve the two-sided exchange.",
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await settleForScreenshot(page);
    await page.screenshot({
      path: testInfo.outputPath(`learn-conversations-${viewport.width}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(snapshotHref);
  await journey.getByRole("link", { name: /^Reach/ }).click();
  await expect(page).toHaveURL(`${exploration.pathname}/reach`);
  await page
    .getByRole("button", { name: "Record outreach", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[name="nicheId"]')).toHaveValue(
    exploration.nicheId,
  );
  await expect(
    dialog.getByRole("combobox", { name: "Exploration · optional" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await journey.getByRole("link", { name: /^Decide/ }).click();
  await expect(page).toHaveURL(`${exploration.pathname}/decide`);
  await page
    .getByRole("button", { name: "Frame a problem", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[name="nicheId"]')).toHaveValue(
    exploration.nicheId,
  );
  await expect(
    dialog.getByRole("combobox", { name: "Exploration · optional" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  expect(runtimeErrors).toEqual([]);
});
