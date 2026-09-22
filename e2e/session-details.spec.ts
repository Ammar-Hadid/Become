import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

async function createAccount(page: Page) {
  const email = `details-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByTestId("name-input").fill("Session Explorer");
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await expect(page.getByRole("heading", { name: /Session/ })).toBeVisible();
}

async function recordSession(
  page: Page,
  details: {
    activity: string;
    focus?: string;
    outcome?: string;
    notes?: string;
  },
) {
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page
    .getByTestId("activity-select")
    .selectOption({ label: details.activity });
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  if (details.focus) {
    await page.getByTestId("session-description").fill(details.focus);
  }
  await page.getByTestId("confirm-start-timer").click();
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  if (details.outcome) {
    await page.getByTestId("session-outcome").fill(details.outcome);
  }
  if (details.notes) {
    await page.getByTestId("session-notes").fill(details.notes);
  }
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByTestId("dashboard-active-session")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "What came from the time?", exact: true }),
  ).toHaveCount(0);
}

test("completed sessions share one responsive details experience across contexts", async ({
  page,
}) => {
  await createAccount(page);
  await recordSession(page, {
    activity: "Coding",
    focus: "Polish the evidence experience",
    outcome: "A clear reusable session drawer",
    notes: "Preserved the original page and scroll position.",
  });
  await recordSession(page, { activity: "Learning" });

  const homeUrl = new URL(page.url());
  expect(homeUrl.pathname).toBe("/");
  const homeSession = page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Polish the evidence experience" });
  await homeSession.scrollIntoViewIfNeeded();
  await homeSession.focus();
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Enter");

  const openUrl = new URL(page.url());
  expect(openUrl.pathname).toBe("/");
  const completedSessionId = openUrl.searchParams.get("session");
  expect(completedSessionId).toBeTruthy();
  await expect(page.getByTestId("session-details")).toBeVisible();
  await expect(page.getByTestId("session-detail-domain")).toHaveText(
    "Engineering",
  );
  await expect(page.getByTestId("session-detail-activity")).toHaveText(
    "Coding",
  );
  await expect(page.getByTestId("session-detail-focus")).toContainText(
    "Polish the evidence experience",
  );
  await expect(page.getByTestId("session-detail-outcome")).toContainText(
    "A clear reusable session drawer",
  );
  await expect(page.getByTestId("session-detail-notes")).toContainText(
    "Preserved the original page and scroll position.",
  );
  await expect(page.getByTestId("session-detail-start")).toContainText("at");
  await expect(page.getByTestId("session-detail-end")).toContainText("at");
  await expect(page.getByTestId("session-detail-duration")).not.toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Close session details" }),
  ).toBeFocused();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport!.width < 640) {
    await expect
      .poll(async () => {
        const box = await page.getByTestId("session-details").boundingBox();
        return box
          ? Math.max(Math.abs(box.x), Math.abs(box.width - viewport!.width))
          : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(1);
  } else {
    await expect
      .poll(async () => {
        const box = await page.getByTestId("session-details").boundingBox();
        return box
          ? Math.abs(box.x + box.width - viewport!.width)
          : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(1);
    const drawerBox = await page.getByTestId("session-details").boundingBox();
    expect(drawerBox!.width).toBeLessThan(viewport!.width);
  }

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("session-details")).toHaveCount(0);
  await expect(homeSession).toBeFocused();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("session"))
    .toBeNull();

  await homeSession.click();
  await page.goBack();
  await expect(page.getByTestId("session-details")).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await page.goForward();
  await expect(page.getByTestId("session-details")).toBeVisible();
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page.getByTestId("session-details")).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("session"))
    .toBeNull();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

  const viewHistory = page.getByRole("link", { name: /View history/ });
  await expect(viewHistory).toHaveAttribute("href", "/sessions");
  await viewHistory.click();
  await expect(page).toHaveURL(/\/sessions$/);
  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Polish the evidence experience" })
    .click();
  await expect(page).toHaveURL(/\/sessions\?session=/);
  await expect(page.getByTestId("session-detail-outcome")).toContainText(
    "A clear reusable session drawer",
  );
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page).toHaveURL(/\/sessions$/);

  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Learning" })
    .click();
  await expect(page.getByTestId("session-details")).toBeVisible();
  await expect(page.getByTestId("session-detail-focus")).toHaveCount(0);
  await expect(page.getByTestId("session-detail-outcome")).toHaveCount(0);
  await expect(page.getByTestId("session-detail-notes")).toHaveCount(0);
  await page.getByRole("button", { name: "Close session details" }).click();

  await page.goto(`/domains/engineering?session=${completedSessionId}`);
  await expect(page).toHaveURL(/\/engineering\?session=/);
  const domainUrl = new URL(page.url());
  expect(domainUrl.pathname).toBe("/engineering");
  expect(domainUrl.searchParams.get("session")).toBeTruthy();
  await expect(page.getByTestId("session-details")).toBeVisible();
  await expect(page.getByTestId("session-detail-notes")).toContainText(
    "Preserved the original page and scroll position.",
  );
  await expect(page.getByTestId("session-detail-outcome")).toContainText(
    "A clear reusable session drawer",
  );
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page).toHaveURL(/\/engineering$/);
});

test("corrects a forgotten stop time from session details", async ({
  page,
}) => {
  await createAccount(page);
  await recordSession(page, { activity: "Coding", focus: "Forgotten stop" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Forgotten stop" })
    .click();
  const id = new URL(page.url()).searchParams.get("session");
  expect(id).toBeTruthy();

  const now = Date.now();
  await prisma.session.update({
    where: { id: id! },
    data: { startedAt: new Date(now - 2 * 3600000) },
  });
  await page.reload();
  await expect(page.getByTestId("session-details")).toBeVisible();
  await page.getByRole("button", { name: "Edit recorded time" }).click();
  const inputBounds = await page
    .getByTestId("session-corrected-end")
    .boundingBox();
  expect(inputBounds).not.toBeNull();
  expect(inputBounds!.x + inputBounds!.width).toBeLessThanOrEqual(390);
  const actualStop = DateTime.fromMillis(now - 3600000, {
    zone: APP_TIMEZONE,
  }).toFormat("yyyy-MM-dd'T'HH:mm");
  await page.getByTestId("session-corrected-end").fill(actualStop);
  await page.getByRole("button", { name: "Save time" }).click();

  const response = await page.request.get(`/api/sessions/${id}`);
  expect(response.ok()).toBe(true);
  const corrected = (await response.json()) as {
    endedAt: string;
    durationSeconds: number;
  };
  expect(
    DateTime.fromISO(corrected.endedAt)
      .setZone(APP_TIMEZONE)
      .toFormat("yyyy-MM-dd'T'HH:mm"),
  ).toBe(actualStop);
  await expect(page.getByTestId("session-detail-duration")).toHaveText(
    formatDuration(corrected.durationSeconds, true),
  );
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(
    page.getByTestId("session-row-trigger").filter({
      hasText: "Forgotten stop",
    }),
  ).toContainText(formatDuration(corrected.durationSeconds, true));
});
