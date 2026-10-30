import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "./utils/browser-test.util";
import type {
  SessionDetailItem,
  SessionListItem,
  TimerSnapshot,
} from "../src/features/sessions/types/session.types";

test.setTimeout(60_000);

async function account(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable Pause Journey");
  await page
    .getByTestId("email-input")
    .fill(`session-pause-${randomUUID()}@example.test`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-pause-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

async function followShellLink(page: Page, href: string) {
  const mobileMenu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .locator(`a[href="${href}"]`)
      .click();
  } else {
    await page
      .getByRole("button", { name: "Open area navigation", exact: true })
      .click();
    const navigation = page.getByRole("navigation", {
      name: "Desktop area navigation",
      exact: true,
    });
    const label = href === "/content" ? "Content" : "Entrepreneurship";
    const area = navigation.getByRole("button", { name: label, exact: true });
    if (!(await area.count()))
      await navigation.locator(".desktop-rail-window").press("ArrowUp");
    await area.click();
    await page.keyboard.press("Escape");
  }
  await expect(page).toHaveURL(href);
}

async function start(page: Page, focus = "Keep this focus through a break") {
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page
    .getByRole("dialog", { name: "What are you working on?" })
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill(focus);
  const response = page
    .waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/sessions" &&
        response.request().method() === "POST",
    )
    .then(async (response) => {
      const body = (await response.json()) as {
        session: SessionListItem;
        timer: TimerSnapshot;
      };
      expect(response.ok(), JSON.stringify(body)).toBe(true);
      return body;
    });
  await page.getByTestId("confirm-start-timer").click();
  const result = await response;
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-session-id",
    result.session.id,
  );
  return result;
}

async function change(page: Page, operation: "pause" | "resume", id: string) {
  const response = page
    .waitForResponse(`/api/sessions/${id}/${operation}`)
    .then(async (response) => {
      const body = (await response.json()) as {
        session: SessionListItem;
        timer: TimerSnapshot;
      };
      expect(response.ok(), JSON.stringify(body)).toBe(true);
      return body;
    });
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId(`${operation}-session`)
    .click();
  return await response;
}

async function finish(page: Page, id: string) {
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  const response = page
    .waitForResponse(`/api/sessions/${id}/complete`)
    .then(async (response) => {
      const body = (await response.json()) as {
        session: SessionDetailItem;
        timer: TimerSnapshot;
      };
      expect(response.ok(), JSON.stringify(body)).toBe(true);
      return body;
    });
  await page.getByTestId("confirm-stop-timer").click();
  const result = await response;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return result;
}

test("repeated breaks preserve one session and paused Home recovers with frozen focus", async ({
  page,
}, info) => {
  await account(page);
  const original = await start(page);
  const card = page.getByTestId("dashboard-active-session");
  await expect
    .poll(async () => Number(await card.getAttribute("data-elapsed-seconds")))
    .toBeGreaterThan(0);
  const firstPause = await change(page, "pause", original.session.id);
  const frozen = String(firstPause.session.durationSeconds);
  await expect(card).toHaveAttribute("data-status", "PAUSED");
  await expect(card).toHaveAttribute("data-elapsed-seconds", frozen);
  await expect(page.locator(".app-header-focus")).toHaveAttribute(
    "data-timer-state",
    "paused",
  );
  await page.clock.install();
  await page.clock.fastForward(10 * 60 * 1000);
  await expect(card).toHaveAttribute("data-elapsed-seconds", frozen);
  await page.reload();
  await expect(card).toHaveAttribute("data-status", "PAUSED");
  await expect(card).toHaveAttribute("data-elapsed-seconds", frozen);
  await expect(card.getByTestId("resume-session")).toBeVisible();
  await expect(card.getByTestId("end-session")).toBeVisible();
  await expect(card).toContainText("Breaks excluded");
  await expect(page.getByText("Running", { exact: true })).toHaveCount(0);
  if (page.viewportSize()!.width <= 639) {
    const header = await page.getByRole("banner").boundingBox();
    const resume = await card.getByTestId("resume-session").boundingBox();
    expect(resume!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await card.getByTestId("resume-session").click({ trial: true });
  }
  await page.screenshot({
    path: info.outputPath("paused-home.png"),
    fullPage: true,
  });
  await page.clock.setSystemTime(new Date());
  await page.clock.resume();
  const resumed = await change(page, "resume", original.session.id);
  expect(resumed.session.id).toBe(original.session.id);
  expect(resumed.session.startedAt).toBe(original.session.startedAt);
  await expect(card).toHaveAttribute("data-status", "RUNNING");
  await expect
    .poll(async () => Number(await card.getAttribute("data-elapsed-seconds")))
    .toBeGreaterThan(firstPause.session.durationSeconds);
  const secondPause = await change(page, "pause", original.session.id);
  expect(secondPause.timer.revision).toBeGreaterThan(resumed.timer.revision);
  const completed = await finish(page, original.session.id);
  expect(completed.session.id).toBe(original.session.id);
  expect(completed.session.durationSeconds).toBe(
    secondPause.session.durationSeconds,
  );
  expect(completed.session.totalPausedMilliseconds).toBeGreaterThan(0);
  expect(completed.timer.activeSession).toBeNull();
});

test("paused End keeps the optional wrap-up paused through cancel and keyboard dismissal", async ({
  page,
}) => {
  await account(page);
  const original = await start(page);
  const paused = await change(page, "pause", original.session.id);
  let resumeRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/resume")) resumeRequests++;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await expect(page.getByTestId("paused-wrap-up")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close dialog", exact: true }),
  ).toBeFocused();
  await page
    .getByTestId("session-outcome")
    .fill("A useful result before the break");
  await page.getByRole("button", { name: "Keep paused", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-elapsed-seconds",
    String(paused.session.durationSeconds),
  );
  await page
    .getByRole("button", { name: "End focus session", exact: true })
    .click();
  await expect(page.getByTestId("paused-wrap-up")).toContainText(
    "Session paused. Break time stays excluded while you wrap up.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  const completed = await finish(page, original.session.id);
  expect(completed.session.outcome).toBe("A useful result before the break");
  expect(completed.session.durationSeconds).toBe(
    paused.session.durationSeconds,
  );
  expect(resumeRequests).toBe(0);
  await page.goto("/sessions");
  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: original.session.description! })
    .click();
  await expect(page.getByTestId("session-detail-break-time")).toBeVisible();
});

test("pause, resume, and paused completion work while refreshed server components are held", async ({
  page,
}) => {
  await account(page);
  const original = await start(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.headers().rsc === "1" &&
      new URL(request.url()).pathname === "/"
    )
      await gate;
    await route.continue().catch(() => {});
  });
  try {
    await change(page, "pause", original.session.id);
    await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
      "data-status",
      "PAUSED",
    );
    await change(page, "resume", original.session.id);
    await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
      "data-status",
      "RUNNING",
    );
    const paused = await change(page, "pause", original.session.id);
    const saved = await finish(page, original.session.id);
    expect(saved.session.durationSeconds).toBe(paused.session.durationSeconds);
    await expect(page.getByTestId("dashboard-active-session")).toHaveCount(0);
    await expect(
      page.locator('[data-testid="start-timer-trigger"]:visible'),
    ).toBeVisible();
    await expect(page.getByText("Running", { exact: true })).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("other tabs reconcile pause, resume, and completion", async ({
  page,
  context,
}) => {
  await account(page);
  const original = await start(page);
  const other = await context.newPage();
  await other.goto("/?pause=journey&tab=other");
  await change(page, "pause", original.session.id);
  await other.bringToFront();
  await other.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(other.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "PAUSED",
  );
  await change(other, "resume", original.session.id);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "RUNNING",
  );
  await change(page, "pause", original.session.id);
  await other.bringToFront();
  await other.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(other.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "PAUSED",
  );
  await finish(other, original.session.id);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("dashboard-active-session")).toHaveCount(0);
  await page.goto("/sessions");
  await expect(
    page
      .getByTestId("session-row-trigger")
      .filter({ hasText: original.session.description! }),
  ).toBeVisible();
  await expect(page.getByText("Running", { exact: true })).toHaveCount(0);
  await other.close();
});

test("a lost completion acknowledgement cannot clear a replacement session on retry", async ({
  page,
  context,
}) => {
  await account(page);
  const original = await start(page, "Original paused session");
  await change(page, "pause", original.session.id);
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await page.route(
    `**/api/sessions/${original.session.id}/complete`,
    async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.getByTestId("confirm-stop-timer").click();
  await expect(
    page.getByText("Could not confirm the save.", { exact: false }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/?pause=journey&tab=replacement");
  const replacement = await start(other, "Replacement running session");
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-session-id",
    replacement.session.id,
  );
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-session-id",
    replacement.session.id,
  );
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "RUNNING",
  );
  await other.close();
});

test("a paused session blocks every global start and Content's direct start", async ({
  page,
  baseURL,
}) => {
  await account(page);
  let starts = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/sessions" &&
      request.method() === "POST"
    )
      starts++;
  });
  const original = await start(page);
  await change(page, "pause", original.session.id);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("become:start-timer")),
  );
  await expect(page.getByRole("dialog")).toContainText("without resuming");
  await expect(page.getByTestId("confirm-start-timer")).toHaveCount(0);
  await page.keyboard.press("Escape");
  const created = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "CREATE_CONTENT",
      operationKey: randomUUID(),
      format: "LONG_FORM",
      draft: {
        title: "Content waits for the existing session",
        purpose: "Keep one timer",
        audience: "",
        notes: "",
      },
    },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const content = (await created.json()).workspace;
  await followShellLink(page, "/content");
  await page.locator(`a[href^="/content/${content.id}"]`).first().click();
  const rail = page.getByRole("complementary", { name: "Variant progress" });
  await expect(rail).toContainText("Paused");
  await expect(
    rail.getByRole("button", { name: "Start focus", exact: true }),
  ).toHaveCount(0);
  await expect(
    rail.getByRole("button", { name: "View current session", exact: true }),
  ).toBeVisible();
  await rail
    .getByRole("button", { name: "View current session", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByTestId("resume-session"),
  ).toBeVisible();
  await expect(page.getByTestId("confirm-start-timer")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await followShellLink(page, "/entrepreneurship");
  await expect(
    page.getByRole("heading", {
      name: "Entrepreneurship",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="start-timer-trigger"]:visible'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "End focus session", exact: true })
    .click();
  await expect(page.getByTestId("paused-wrap-up")).toBeVisible();
  await expect(page.getByTestId("confirm-start-timer")).toHaveCount(0);
  expect(starts).toBe(1);
});

test("a replacement session starts with fresh wrap-up fields after a cancelled draft", async ({
  page,
  context,
}) => {
  await account(page);
  const original = await start(page, "Session with a private draft");
  await change(page, "pause", original.session.id);
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await page
    .getByTestId("session-outcome")
    .fill("Only for the original session");
  await page.getByTestId("session-notes").fill("Original reflection");
  await page.getByRole("button", { name: "Record concrete evidence" }).click();
  await page
    .getByTestId("engineering-evidence-title")
    .fill("Original evidence");
  await page.getByRole("button", { name: "Keep paused", exact: true }).click();

  const other = await context.newPage();
  await other.goto("/?pause=journey&tab=replacement-draft");
  await finish(other, original.session.id);
  const replacement = await start(other, "New session, fresh reflection");
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-session-id",
    replacement.session.id,
  );
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("end-session")
    .click();
  await expect(page.getByTestId("session-outcome")).toHaveValue("");
  await expect(page.getByTestId("session-notes")).toHaveValue("");
  await expect(page.getByTestId("engineering-evidence-title")).toHaveCount(0);
  await page.getByRole("button", { name: "Record concrete evidence" }).click();
  await expect(page.getByTestId("engineering-evidence-title")).toHaveValue("");
  await other.close();
});

test("a JSON server error after a committed pause reconciles without replaying it", async ({
  page,
  context,
}) => {
  await account(page);
  const original = await start(page);
  const opened = context.waitForEvent("page");
  await page.evaluate(() => {
    window.open("/?pause=journey&window=uncertain", "pause-recovery", "popup");
  });
  const other = await opened;
  await expect(other.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "RUNNING",
  );
  let pauseRequests = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname ===
      `/api/sessions/${original.session.id}/pause`
    )
      pauseRequests++;
  });
  await page.route(
    `**/api/sessions/${original.session.id}/pause`,
    async (route) => {
      const saved = await route.fetch();
      expect(saved.ok()).toBe(true);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Acknowledgement unavailable" }),
      });
    },
    { times: 1 },
  );
  await page
    .getByTestId("dashboard-active-session")
    .getByTestId("pause-session")
    .click();
  await expect(page.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "PAUSED",
  );
  await expect(
    page.getByTestId("dashboard-active-session").getByRole("alert"),
  ).toContainText("Review its current status");
  await expect(
    page.getByTestId("dashboard-active-session").getByTestId("resume-session"),
  ).toBeEnabled();
  await expect(other.getByTestId("dashboard-active-session")).toHaveAttribute(
    "data-status",
    "PAUSED",
  );
  expect(await other.evaluate(() => document.visibilityState)).toBe("visible");
  expect(pauseRequests).toBe(1);
  await other.close();
});
