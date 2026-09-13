import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "./utils/browser-test.util";

async function createDisposableArrivalUser(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable arrival guard QA");
  await page
    .getByTestId("email-input")
    .fill(`cots-arrival-guard-${randomUUID()}@example.test`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-arrival-password");
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(
    /\/direction\/seasons\/\d+\/[1-4]\/opening\?arrival=season/,
    { timeout: 15_000 },
  );
}

async function expectNoSeasonTakeover(page: Page) {
  await page.waitForTimeout(350);
  await expect(
    page.getByRole("heading", { name: "The next chapter starts here." }),
  ).toHaveCount(0);
}

test("season arrival preserves deep links, unfinished timer input, and an active timer", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await createDisposableArrivalUser(page);

  await page.goto("/?resume=timer");
  await expect(page).toHaveURL(/\?resume=timer$/);
  await expectNoSeasonTakeover(page);

  await page.goto("/#return-to-session");
  await expect(page).toHaveURL(/#return-to-session$/);
  await expectNoSeasonTakeover(page);

  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  const timerDialog = page.getByRole("dialog", {
    name: "What are you working on?",
  });
  await expect(timerDialog).toBeVisible();
  await page.getByTestId("session-description").fill("Unfinished timer notes");
  await page.evaluate(() => window.history.replaceState({}, "", "/"));
  await expect(page).toHaveURL("/");
  await expectNoSeasonTakeover(page);
  await expect(timerDialog).toBeVisible();
  await expect(page.getByTestId("session-description")).toHaveValue(
    "Unfinished timer notes",
  );

  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.evaluate(() =>
    window.history.replaceState({}, "", "/?timer=pending"),
  );
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByTestId("activity-select").selectOption({ label: "Coding" });
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill("Protected active work");

  let releaseStart: (() => void) | undefined;
  const startCanFinish = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });
  let startReceived: (() => void) | undefined;
  const startWasReceived = new Promise<void>((resolve) => {
    startReceived = resolve;
  });
  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    startReceived?.();
    await startCanFinish;
    await route.continue();
  });

  await page.getByTestId("confirm-start-timer").click();
  await startWasReceived;
  await expect(page.locator("html")).toHaveAttribute(
    "data-timer-mutation-pending",
    "",
  );
  await page.evaluate(() => window.history.replaceState({}, "", "/"));
  await expectNoSeasonTakeover(page);
  releaseStart?.();

  const activeTimer = page.locator(
    '[data-testid="active-timer-trigger"]:visible',
  );
  await expect(activeTimer).toBeVisible();
  await expect(activeTimer).toHaveAttribute("data-session-id", /.+/);
  await expect(activeTimer).toHaveAttribute(
    "aria-label",
    "View running Coding session",
  );
  await page.evaluate(() => {
    window.history.replaceState({}, "", "/?timer=active");
    window.history.replaceState({}, "", "/");
  });
  await expect(page).toHaveURL("/");
  await expectNoSeasonTakeover(page);
  await expect(activeTimer).toBeVisible();
});
