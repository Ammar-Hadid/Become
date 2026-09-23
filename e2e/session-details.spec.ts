import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
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
  await expect(page.getByTestId("session-duration-picker")).toBeVisible();
  const hours = page.getByRole("spinbutton", { name: "Hours" });
  const minutes = page.getByRole("spinbutton", { name: "Minutes" });
  const seconds = page.getByRole("spinbutton", { name: "Seconds" });
  const hoursInput = page.getByTestId("session-duration-hours-input");
  await hours.focus();
  await hours.press("Home");
  await hours.press("ArrowDown");
  await minutes.press("Home");
  await seconds.press("Home");
  await page.getByRole("button", { name: "Set minutes to 1" }).click();
  await expect(minutes).toHaveAttribute("aria-valuenow", "1");
  await minutes.hover();
  const drawerScrollBeforeWheel = await page
    .getByTestId("session-details")
    .evaluate((drawer) => drawer.scrollTop);
  await page.mouse.wheel(0, -120);
  await expect(minutes).toHaveAttribute("aria-valuenow", "0");
  expect(
    await page
      .getByTestId("session-details")
      .evaluate((drawer) => drawer.scrollTop),
  ).toBe(drawerScrollBeforeWheel);
  const minuteBounds = await minutes.boundingBox();
  expect(minuteBounds).not.toBeNull();
  const minuteCenterX = minuteBounds!.x + minuteBounds!.width / 2;
  const minuteCenterY = minuteBounds!.y + minuteBounds!.height / 2;
  const minuteRowHeight = await minutes.evaluate(
    (element) => element.parentElement!.parentElement!.clientHeight / 5,
  );
  await page.mouse.move(minuteCenterX, minuteCenterY);
  await page.mouse.down();
  await page.mouse.move(minuteCenterX, minuteCenterY - minuteRowHeight, {
    steps: 4,
  });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(minutes).toHaveAttribute("aria-valuenow", "1");
  await minutes.press("Home");
  await hours.press("End");
  await expect(hours).toHaveAttribute("aria-valuenow", "24");
  await expect(minutes).toHaveAttribute("aria-valuemax", "0");
  await expect(seconds).toHaveAttribute("aria-valuemax", "0");

  async function wheelOffset() {
    return hours.evaluate((element) =>
      Number.parseFloat(
        (element.parentElement as HTMLElement).style.getPropertyValue(
          "--duration-wheel-offset",
        ),
      ),
    );
  }

  await page.waitForTimeout(250);
  await hours.hover();
  for (let tick = 0; tick < 3; tick += 1) {
    await page.mouse.wheel(0, 120);
    await expect(hours).toHaveAttribute("aria-valuenow", "24");
    expect(await wheelOffset()).toBe(0);
    await page.waitForTimeout(120);
  }
  await page.mouse.wheel(0, -120);
  await expect(hours).toHaveAttribute("aria-valuenow", "23");
  await page.mouse.wheel(0, 400);
  await expect(hours).toHaveAttribute("aria-valuenow", "24");
  expect(await wheelOffset()).toBe(0);
  await hours.press("End");

  async function hardSwipeHours(direction: -1 | 1) {
    const bounds = await hours.boundingBox();
    expect(bounds).not.toBeNull();
    const x = bounds!.x + bounds!.width / 2;
    const y = bounds!.y + bounds!.height / 2;
    const rowHeight = await hours.evaluate(
      (element) => element.parentElement!.parentElement!.clientHeight / 5,
    );
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + direction * 8);
    await page.mouse.move(x, y + direction * rowHeight * 3.5);
    const offset = await hours.evaluate((element) =>
      Number.parseFloat(
        (element.parentElement as HTMLElement).style.getPropertyValue(
          "--duration-wheel-offset",
        ),
      ),
    );
    expect(offset * direction).toBeGreaterThanOrEqual(0);
    expect(Math.abs(offset)).toBeLessThanOrEqual(rowHeight / 3 + 1);
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(
      await hours.evaluate((element) =>
        Number.parseFloat(
          (element.parentElement as HTMLElement).style.getPropertyValue(
            "--duration-wheel-offset",
          ),
        ),
      ),
    ).toBe(0);
  }

  await hours.dblclick();
  await hoursInput.fill("23");
  await hoursInput.press("Enter");
  await hardSwipeHours(-1);
  await expect(hours).toHaveAttribute("aria-valuenow", "24");
  await hours.dblclick();
  await hoursInput.fill("1");
  await hoursInput.press("Enter");
  await hardSwipeHours(1);
  await expect(hours).toHaveAttribute("aria-valuenow", "0");
  await hours.hover();
  for (let tick = 0; tick < 3; tick += 1) {
    await page.mouse.wheel(0, -120);
    await expect(hours).toHaveAttribute("aria-valuenow", "0");
    expect(await wheelOffset()).toBe(0);
    await page.waitForTimeout(120);
  }
  await page.mouse.wheel(0, 120);
  await expect(hours).toHaveAttribute("aria-valuenow", "1");
  await page.mouse.wheel(0, -400);
  await expect(hours).toHaveAttribute("aria-valuenow", "0");
  expect(await wheelOffset()).toBe(0);
  await hours.press("End");
  await hours.press("ArrowDown");
  await minutes.press("ArrowDown");
  await expect(hours).toHaveAttribute("aria-valuenow", "24");
  await expect(minutes).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("button", { name: "Set hours to 25" }),
  ).toHaveCount(0);
  await hours.dblclick();
  await hoursInput.fill("1");
  await hoursInput.press("Enter");
  await expect(hours).toHaveAttribute("aria-valuenow", "1");
  await seconds.dblclick();
  const secondsInput = page.getByTestId("session-duration-seconds-input");
  await secondsInput.fill("15");
  await secondsInput.press("Enter");
  await expect(seconds).toHaveAttribute("aria-valuenow", "15");
  await seconds.press("Home");
  const fastBounds = await minutes.boundingBox();
  expect(fastBounds).not.toBeNull();
  const fastX = fastBounds!.x + fastBounds!.width / 2;
  const fastY = fastBounds!.y + fastBounds!.height / 2;
  await page.mouse.move(fastX, fastY);
  await page.mouse.down();
  await page.mouse.move(fastX, fastY - 120);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await minutes.getAttribute("aria-valuenow")))
    .toBeGreaterThan(2);
  await minutes.press("Home");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await minutes.press("ArrowDown");
  await expect(minutes).toHaveAttribute("aria-valuenow", "1");
  expect(
    await minutes.evaluate(
      (element) => getComputedStyle(element.parentElement!).transitionDuration,
    ),
  ).toBe("0s");
  await minutes.press("Home");
  await expect(hours).toHaveAttribute("aria-valuenow", "1");
  await expect(minutes).toHaveAttribute("aria-valuenow", "0");
  await expect(seconds).toHaveAttribute("aria-valuenow", "0");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const selectedBounds = await Promise.all(
    [hours, minutes, seconds].map((column) => column.boundingBox()),
  );
  expect(selectedBounds.every(Boolean)).toBe(true);
  const selectedCenters = selectedBounds.map(
    (bounds) => bounds!.y + bounds!.height / 2,
  );
  expect(
    Math.max(...selectedCenters) - Math.min(...selectedCenters),
  ).toBeLessThan(2);
  for (const column of [hours, minutes, seconds]) {
    expect(
      await column.evaluate(
        (element) => element.parentElement?.parentElement?.scrollTop,
      ),
    ).toBe(0);
  }
  const pickerBounds = await page
    .getByTestId("session-duration-picker")
    .boundingBox();
  expect(pickerBounds).not.toBeNull();
  expect(pickerBounds!.x + pickerBounds!.width).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 320, height: 720 });
  const narrowBounds = await page
    .getByTestId("session-duration-picker")
    .boundingBox();
  expect(narrowBounds).not.toBeNull();
  expect(narrowBounds!.x + narrowBounds!.width).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Save time" }).click();

  await expect(page.getByTestId("session-detail-duration")).toHaveText("1h 0m");

  const response = await page.request.get(`/api/sessions/${id}`);
  expect(response.ok()).toBe(true);
  const corrected = (await response.json()) as {
    endedAt: string;
    durationSeconds: number;
  };
  expect(corrected.endedAt).toBe(new Date(now - 3600000).toISOString());
  expect(corrected.durationSeconds).toBe(3600);
  const overLimit = await page.request.patch(`/api/sessions/${id}`, {
    headers: { origin: new URL(page.url()).origin },
    data: {
      durationSeconds: 24 * 3600 + 1,
      expectedEndedAt: corrected.endedAt,
    },
  });
  expect(overLimit.status()).toBe(400);
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
