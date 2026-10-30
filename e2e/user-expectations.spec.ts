import { expect, test, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { openSessionHistory } from "./utils/session-history.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

async function createAccount(page: Page) {
  page.setDefaultTimeout(15_000);
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByTestId("name-input").fill("Expectation Explorer");
  await page.getByTestId("email-input").fill(
    `expectations-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
  );
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

test("reopening a session shows a correction saved in another tab", async ({ page, context }) => {
  await createAccount(page);
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("dialog", { name: "What are you working on?" }).getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("session-description").fill("Reopen corrected session");
  await page.getByTestId("confirm-start-timer").click();
  const timer = page.getByTestId("dashboard-active-session");
  await expect(timer).toBeVisible();
  const id = await timer.getAttribute("data-session-id");
  expect(id).toBeTruthy();
  await timer.getByTestId("end-session").click();
  await page.getByTestId("confirm-stop-timer").click();
  await expect(timer).toHaveCount(0);
  // Give this disposable session enough elapsed time for a realistic correction.
  await prisma.session.update({
    where: { id: id! },
    data: { startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  });
  await openSessionHistory(page);
  const row = page.getByTestId("session-row-trigger").filter({ hasText: "Reopen corrected session" });
  await row.click();
  await expect(page.getByTestId("session-detail-duration")).toContainText("1h");
  await page.getByRole("button", { name: "Close session details" }).click();
  await expect(page.getByTestId("session-details")).toHaveCount(0);

  const otherTab = await context.newPage();
  await otherTab.goto(`/sessions?session=${id}`);
  await otherTab.getByRole("button", { name: "Edit recorded time" }).click();
  for (const part of ["hours", "minutes", "seconds"]) {
    await otherTab.getByRole("spinbutton", { name: part, exact: false }).dblclick();
    const field = otherTab.getByTestId(`session-duration-${part}-input`);
    await field.fill(part === "minutes" ? "10" : "0");
    await field.press("Enter");
  }
  await otherTab.getByRole("button", { name: "Save time", exact: true }).click();
  await expect(otherTab.getByTestId("session-detail-duration")).toHaveText("10m");
  await otherTab.close();

  await row.click();
  await expect(page.getByTestId("session-detail-duration")).toHaveText("10m");
});

test("project validation keeps the user's entries available for correction", async ({ page }) => {
  await createAccount(page);
  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Preserve my project draft");
  await page.getByTestId("engineering-project-context").selectOption("PROFESSIONAL");
  await page.locator('[name="startedOn"]').fill("2026-10-20");
  await page.locator('[name="completedOn"]').fill("2026-10-01");
  await page.locator('[name="notes"]').fill("Keep these notes after validation.");
  await page.getByTestId("save-engineering-project").click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Completion date cannot be before the start date.");
  await expect(page.getByTestId("engineering-project-name")).toHaveValue("Preserve my project draft");
  await expect(page.locator('[name="notes"]')).toHaveValue("Keep these notes after validation.");
  await expect(page.locator('[name="startedOn"]')).toHaveValue("2026-10-20");
  await expect(page.getByTestId("engineering-project-context")).toHaveValue("PROFESSIONAL");
  await page.locator('[name="completedOn"]').fill("2026-10-21");
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(/\/engineering\/projects\/(?!new$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Preserve my project draft", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("Keep these notes after validation.");
});

test("evidence validation keeps the draft available to correct and save", async ({ page }) => {
  await createAccount(page);
  await page.goto("/engineering/evidence/new");
  await page.getByTestId("engineering-evidence-type-select").selectOption("DEPLOYMENT");
  await page.getByTestId("engineering-evidence-title").fill("   ");
  await page.locator('[name="details"]').fill("Keep the deployment details after validation.");
  await page.getByTestId("save-engineering-evidence").click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Enter an evidence title.");
  await expect(page.locator('[name="details"]')).toHaveValue("Keep the deployment details after validation.");
  await expect(page.getByTestId("engineering-evidence-type-select")).toHaveValue("DEPLOYMENT");
  await page.getByTestId("engineering-evidence-title").fill("Recovered deployment draft");
  await page.getByTestId("save-engineering-evidence").click();
  await expect(page).toHaveURL(/\/engineering\/evidence(?:\?.*)?$/);
  await expect(page.locator("main")).toContainText("Recovered deployment draft");
});

test("a failed C.O.T.S answer preserves a newer question draft", async ({ page }) => {
  await createAccount(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/cots/conversation", async (route) => {
    requests += 1;
    if (requests === 1) {
      await gate;
      await route.fulfill({ status: 503, json: { error: "The answer could not be prepared." } });
    } else {
      expect(route.request().postDataJSON()).toMatchObject({ question: "A newer draft I want to keep", history: [] });
      await route.fulfill({ json: { status: "READY", reply: "Your new question was received." } });
    }
  });
  try {
    await page.getByRole("button", { name: "Ask C.O.T.S anything", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Ask me anything", exact: true });
    const question = dialog.getByRole("textbox", { name: "Your question", exact: true });
    await question.fill("My first question");
    await dialog.getByRole("button", { name: "Send question", exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    await question.fill("A newer draft I want to keep");
    release();
    await expect(dialog.getByRole("alert")).toContainText("The answer could not be prepared.");
    await expect(question).toHaveValue("A newer draft I want to keep");
    await dialog.getByRole("button", { name: "Send question", exact: true }).click();
    await expect(dialog.getByRole("log")).toContainText("Your new question was received.");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("reopening pending Nexo analysis reuses the request and failed refresh hides old facts", async ({ page }) => {
  await createAccount(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/nexo/season-analysis", async (route) => {
    requests += 1;
    if (requests === 1) {
      await route.fulfill({ json: {
        status: "READY", summary: "This is the earlier Season analysis.",
        nextStep: "Review the earlier recorded facts.", evidence: [{ id: "earlier", text: "Earlier fact" }],
      } });
    } else {
      await gate;
      await route.fulfill({ status: 503, json: { error: "Current facts could not be read." } });
    }
  });
  try {
    const trigger = page.getByRole("button", { name: "Why this state?", exact: true });
    const dialog = page.getByRole("dialog", { name: "Season analysis", exact: true });
    await trigger.click();
    await expect(dialog).toContainText("This is the earlier Season analysis.");
    await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
    await trigger.click();
    await expect.poll(() => requests).toBe(2);
    await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
    await trigger.click();
    await expect(dialog.getByRole("status")).toContainText("Nexo is reading");
    await page.waitForTimeout(300);
    expect(requests).toBe(2);
    release();
    await expect(dialog.getByRole("alert")).toContainText("Current facts could not be read.");
    await expect(dialog).not.toContainText("This is the earlier Season analysis.");
    await expect(dialog).not.toContainText("Earlier fact");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

for (const kind of ["conversation", "analysis"] as const) {
  test(`a stalled ${kind} releases its loading state and permits retry`, async ({ page }) => {
    await createAccount(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Exercise the browser's real abort behavior without waiting 3.5 minutes.
    await page.evaluate(() => {
      const timeout = AbortSignal.timeout.bind(AbortSignal);
      AbortSignal.timeout = (milliseconds) => timeout(milliseconds === 210_000 ? 1_000 : milliseconds);
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    await page.route(kind === "conversation" ? "**/api/cots/conversation" : "**/api/nexo/season-analysis", async (route) => {
      requests += 1;
      if (requests === 1) {
        await held;
        await route.abort();
        return;
      }
      await route.fulfill({ json: kind === "conversation"
        ? { status: "READY", reply: "The retried question succeeded." }
        : { status: "READY", summary: "The current Season analysis succeeded.", nextStep: "Continue with the current facts.", evidence: [] },
      });
    });
    try {
      if (kind === "conversation") {
        await page.getByRole("button", { name: "Ask C.O.T.S anything", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "Ask me anything", exact: true });
        const question = dialog.getByRole("textbox", { name: "Your question", exact: true });
        const send = dialog.getByRole("button", { name: "Send question", exact: true });
        await question.fill("Preserve this question for retry.");
        await send.click();
        await expect(dialog.getByRole("alert")).toHaveText("The answer took too long. Please try again.");
        await expect(question).toHaveValue("Preserve this question for retry.");
        await expect(send).toBeEnabled();
        release();
        await send.click();
        await expect(dialog.getByRole("log")).toContainText("The retried question succeeded.");
      } else {
        const trigger = page.getByRole("button", { name: "Why this state?", exact: true });
        const dialog = page.getByRole("dialog", { name: "Season analysis", exact: true });
        await trigger.click();
        await expect(dialog.getByRole("alert")).toHaveText("The analysis took too long. Please try again.");
        await expect(dialog.getByRole("status")).toHaveCount(0);
        release();
        await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
        await trigger.click();
        await expect(dialog).toContainText("The current Season analysis succeeded.");
      }
      expect(requests).toBe(2);
    } finally {
      release();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}
