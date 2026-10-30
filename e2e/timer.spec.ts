import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";

async function createAccount(page: Page, name: string) {
  const email = `timer-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

test("a new user can start, recover, and complete a timer", async ({
  page,
}) => {
  await createAccount(page, "Ammar");
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page
    .getByRole("dialog", { name: "What are you working on?" })
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  await page.getByTestId("activity-select").selectOption({ label: "Coding" });
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill("Build the timer journey");
  await page.getByTestId("confirm-start-timer").click();
  await page.goto("/");

  const shellTimer = page.locator(".app-header-focus [data-elapsed-seconds]");
  const dashboardTimer = page.getByTestId("dashboard-active-session");
  await expect(shellTimer).toBeVisible();
  await expect(dashboardTimer).toBeVisible();
  const activeSessionId = await dashboardTimer.getAttribute("data-session-id");
  expect(activeSessionId).not.toBeNull();
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

  await dashboardTimer.getByTestId("end-session").click();
  await page.getByTestId("session-outcome").fill("Timer journey verified");
  await page.getByTestId("confirm-stop-timer").click();
  await expect(dashboardTimer).toHaveCount(0);

  await page.goto("/sessions");
  const completedSessionTrigger = page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Build the timer journey" });
  await completedSessionTrigger.click();
  await expect(page).toHaveURL(/\/sessions\?session=/);
  await expect(page.getByTestId("session-details")).toContainText(
    "Timer journey verified",
  );
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page).toHaveURL(/\/sessions$/);
  await expect(page.getByTestId("session-details")).toHaveCount(0);
});

test("shell controls remain readable and navigation overlays the page", async ({
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
  await deferAutomaticSeasonOpening(page);
  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  const pageBeforeOpen = await page.getByRole("main").boundingBox();
  const navigationTrigger = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  const mobile = await navigationTrigger.isVisible();
  if (mobile) {
    await navigationTrigger.click();
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link"),
    ).toHaveText([
      "Dashboard",
      "Engineering",
      "Finance",
      "Entrepreneurship",
      "Content",
      "Direction",
    ]);
    await page.keyboard.press("Escape");
    await expect(navigationTrigger).toBeFocused();
    await navigationTrigger.click();
  } else {
    await page
      .getByRole("button", { name: "Open area navigation", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", {
        name: "Desktop area navigation",
        exact: true,
      }),
    ).toBeVisible();
  }
  expect(await page.getByRole("main").boundingBox()).toEqual(pageBeforeOpen);
  const accountName = page.locator(".app-header-account-name:visible");
  await expect(accountName).toContainText("Shell Tester");
  expect(
    await accountName.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(12);

  const pageUrl = page.url();
  await page
    .getByRole("button", { name: "Account", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(pageUrl);
  await expect(
    page.getByRole("menuitem", { name: "Sign out", exact: true }),
  ).toBeVisible();

  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
