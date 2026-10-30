import { expect, test, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

async function startTestSession(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Network Recovery");
  await page
    .getByTestId("email-input")
    .fill(
      `network-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
    );
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page
    .getByRole("dialog", { name: "What are you working on?" })
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill("Network recovery work");
  await page.getByTestId("confirm-start-timer").click();
  await expect(page.getByTestId("dashboard-active-session")).toBeVisible();
}

test("a stalled timer change releases its pending state and can be retried", async ({
  page,
}) => {
  await startTestSession(page);
  const timer = page.getByTestId("dashboard-active-session");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/sessions/*/pause", async (route) => {
    await gate;
    await route.abort("failed");
  });
  try {
    await timer.getByTestId("pause-session").click();
    await expect(
      timer.getByText("Could not confirm the timer change.", { exact: false }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(timer.getByTestId("pause-session")).toBeEnabled();
    await expect(timer.getByTestId("end-session")).toBeEnabled();
    release();
    await page.unrouteAll({ behavior: "wait" });
    await timer.getByTestId("pause-session").click();
    await expect(timer.getByTestId("resume-session")).toBeEnabled();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("failed session detail requests close incomplete details and remain retryable", async ({
  page,
}) => {
  await startTestSession(page);
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByTestId("dashboard-active-session")).toHaveCount(0);
  await page.goto("/sessions");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/api\/sessions\/[^/]+$/, (route) => route.abort("failed"));
  const row = page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Network recovery work" });
  await row.click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("session"))
    .toBeNull();
  await expect(page.getByTestId("session-details")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.unrouteAll();
  await row.click();
  await expect(page.getByTestId("session-details")).toBeVisible();
});

test("a stalled recorded-time correction preserves the edit and permits retry", async ({
  page,
}) => {
  await startTestSession(page);
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByTestId("dashboard-active-session")).toHaveCount(0);
  await page.goto("/sessions");
  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Network recovery work" })
    .click();
  const details = page.getByTestId("session-details");
  await details
    .getByRole("button", { name: "Edit recorded time", exact: true })
    .click();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/sessions\/[^/]+$/, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await held;
    await route.abort();
  });
  try {
    await details
      .getByRole("button", { name: "Save time", exact: true })
      .click();
    await expect(details.getByRole("alert")).toContainText(
      "Could not update the session",
      { timeout: 20_000 },
    );
    await expect(
      details.getByRole("button", { name: "Save time", exact: true }),
    ).toBeEnabled();
    await expect(
      details.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeEnabled();
    release();
    await page.unrouteAll({ behavior: "wait" });
    await details
      .getByRole("button", { name: "Save time", exact: true })
      .click();
    await expect(
      details.getByRole("button", { name: "Edit recorded time", exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
