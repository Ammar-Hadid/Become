import { expect, test, type Page } from "@playwright/test";

async function createAccount(page: Page, name: string) {
  const email = `timer-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await expect(
    page.getByRole("heading", { name: new RegExp(name) }),
  ).toBeVisible();
}

test("a new user can start, recover, and complete a timer", async ({
  page,
}) => {
  await createAccount(page, "Ammar");
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByTestId("activity-select").selectOption({ label: "Coding" });
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill("Build the timer journey");
  await page.getByTestId("confirm-start-timer").click();

  const shellTimer = page.locator(
    '[data-testid="active-timer-trigger"]:visible',
  );
  const dashboardTimer = page.getByTestId("dashboard-active-session");
  await expect(shellTimer).toBeVisible();
  await expect(dashboardTimer).toBeVisible();
  const activeSessionId = await dashboardTimer.getAttribute("data-session-id");
  expect(activeSessionId).not.toBeNull();
  await expect(shellTimer).toHaveAttribute("data-session-id", activeSessionId!);
  await expect
    .poll(async () =>
      Number(await dashboardTimer.getAttribute("data-elapsed-seconds")),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const shellElapsed = Number(
        await shellTimer.getAttribute("data-elapsed-seconds"),
      );
      const dashboardElapsed = Number(
        await dashboardTimer.getAttribute("data-elapsed-seconds"),
      );
      return Math.abs(shellElapsed - dashboardElapsed);
    })
    .toBeLessThanOrEqual(1);

  const elapsedBeforeRefresh = Number(
    await dashboardTimer.getAttribute("data-elapsed-seconds"),
  );
  await page.reload();
  await expect(dashboardTimer).toContainText("Build the timer journey");
  await expect
    .poll(async () =>
      Number(await dashboardTimer.getAttribute("data-elapsed-seconds")),
    )
    .toBeGreaterThanOrEqual(elapsedBeforeRefresh);

  await dashboardTimer.click();
  await page.getByTestId("session-outcome").fill("Timer journey verified");
  await page.getByTestId("confirm-stop-timer").click();
  await expect(dashboardTimer).toHaveCount(0);

  const completedSessionTrigger = page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Build the timer journey" });
  await completedSessionTrigger.click();
  await expect(page).toHaveURL(/\/?session=/);
  await expect(page.getByTestId("session-details")).toContainText(
    "Timer journey verified",
  );
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("session-details")).toHaveCount(0);
});

test("shell controls remain readable, separated, centered, and explicit", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account" }).click();
  const fieldLabelSize = await page
    .locator(".field-label")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(fieldLabelSize).toBeGreaterThanOrEqual(12);

  await page.getByTestId("name-input").fill("Shell Tester");
  await page
    .getByTestId("email-input")
    .fill(
      `shell-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByRole("heading", { name: /Shell/ })).toBeVisible();

  const mobileNavigation = page.getByTestId("mobile-bottom-nav");
  if (await mobileNavigation.isVisible()) {
    await expect(page.getByRole("banner")).toHaveCSS("display", "flex");
    const navigationBox = await mobileNavigation.boundingBox();
    const timerBox = await page
      .locator('[data-testid="start-timer-trigger"]:visible')
      .boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(timerBox).not.toBeNull();
    expect(
      Math.abs(
        navigationBox!.x +
          navigationBox!.width / 2 -
          (timerBox!.x + timerBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Open navigation" }).click();
  }

  const overviewSection = page.locator(
    '[data-testid="nav-section-overview"]:visible',
  );
  const domainsSection = page.locator(
    '[data-testid="nav-section-domains"]:visible',
  );
  const overviewBox = await overviewSection.boundingBox();
  const domainsBox = await domainsSection.boundingBox();
  expect(overviewBox).not.toBeNull();
  expect(domainsBox).not.toBeNull();
  expect(
    domainsBox!.y - (overviewBox!.y + overviewBox!.height),
  ).toBeGreaterThanOrEqual(24);

  const navigationFontSize = await overviewSection
    .locator(".nav-link")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  const sectionLabelFontSize = await overviewSection
    .locator(".nav-label")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(navigationFontSize).toBeGreaterThanOrEqual(14);
  expect(sectionLabelFontSize).toBeGreaterThanOrEqual(11);

  const pageUrl = page.url();
  await page.locator('[data-testid="user-identity"]:visible').click();
  await expect(page).toHaveURL(pageUrl);
  await expect(
    page.locator('button[aria-label="Sign out"]:visible'),
  ).toBeVisible();

  await page.locator('button[aria-label="Sign out"]:visible').click();
  await expect(page).toHaveURL(/\/sign-in/);
});
