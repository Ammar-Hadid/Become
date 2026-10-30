import { randomUUID } from "node:crypto";
import type { Route } from "@playwright/test";
import { test, expect, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

async function createDisposableDirectionUser(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `direction-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable direction QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-direction-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

async function expectStyledHomeSeasonCard(page: Page) {
  const card = page.getByRole("region", {
    name: "Season Progress",
    exact: true,
  });
  const progress = card.getByRole("progressbar", {
    name: "Season calendar elapsed",
  });

  await expect(card).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(card).toHaveCSS("display", "flex");
  await expect(card).toHaveCSS("border-top-style", "solid");
  await expect(progress).toHaveAttribute(
    "data-progress-variant",
    "season-ticks",
  );

  const layout = await card.evaluate((element) => {
    const styles = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return {
      backgroundImage: styles.backgroundImage,
      height: bounds.height,
      padding: Number.parseFloat(styles.paddingInlineStart),
      width: bounds.width,
    };
  });

  expect(layout.backgroundImage).not.toBe("none");
  expect(layout.height).toBeGreaterThan(0);
  expect(layout.padding).toBeGreaterThan(0);
  expect(layout.width).toBeGreaterThan(250);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function readDashboardPresentation(page: Page) {
  await expectStyledHomeSeasonCard(page);
  await expect(
    page.getByRole("region", { name: "Dashboard lenses", exact: true }),
  ).toBeVisible();
  const card = page.locator(".dashboard-v2-card").first();
  await expect(card).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  return card.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      background: styles.background,
      border: styles.border,
      radius: styles.borderRadius,
      padding: styles.padding,
      blur: styles.backdropFilter,
      font: styles.font,
    };
  });
}

test("protected dashboard retains its presentation after visiting redesigned Direction", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await createDisposableDirectionUser(page);
  await page.reload();
  const before = await readDashboardPresentation(page);
  await page
    .getByRole("region", { name: "Season Progress", exact: true })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/direction\/seasons\/\d{4}\/[1-4]$/);
  await page
    .getByRole("link", { name: "Become dashboard", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  expect(await readDashboardPresentation(page)).toEqual(before);

  await page.goto("/direction");
  await expect(page.locator(".direction-shell.workspace")).toBeVisible();
  await page.goto("/?opening=paused");
  expect(await readDashboardPresentation(page)).toEqual(before);
});

test("goal library controls and summaries stay readable on narrow mobile screens", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await createDisposableDirectionUser(page);

  const goalTitle = "Turn skill into real-world proof";
  await page.goto("/direction/goals/new");
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill(goalTitle);
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { name: goalTitle })).toBeVisible();
  await page.goto(`/direction/goals?search=${encodeURIComponent(goalTitle)}`);

  const archiveCheckbox = page.getByRole("checkbox", { name: "Archived" });
  await expect(archiveCheckbox).toBeVisible();
  const checkboxSize = await archiveCheckbox.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  expect(checkboxSize).toEqual({ height: 16, width: 16 });

  const summary = page.getByRole("link", { name: new RegExp(goalTitle) });
  await expect(summary).toBeVisible();
  const summaryLayout = await summary.evaluate((element) => {
    const titleRow = element.querySelector<HTMLElement>(
      ".direction-goal-title-row",
    );
    const title = titleRow?.querySelector<HTMLElement>("h3");
    const bounds = element.getBoundingClientRect();
    const titleBounds = title?.getBoundingClientRect();

    return {
      flexDirection: titleRow ? getComputedStyle(titleRow).flexDirection : null,
      overflowsViewport: element.scrollWidth > element.clientWidth,
      summaryWidth: bounds.width,
      titleWidth: titleBounds?.width ?? 0,
    };
  });

  expect(summaryLayout.flexDirection).toBe("column");
  expect(summaryLayout.overflowsViewport).toBe(false);
  expect(summaryLayout.titleWidth).toBeGreaterThan(
    summaryLayout.summaryWidth * 0.6,
  );
});

test("a canonical goal keeps failed conclusion edits", async ({ page }) => {
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  const goalTitle = `A deliberate body of work ${randomUUID().slice(0, 6)}`;
  // Historical evidence remains readable and enforces its original conclusion
  // rules. New simple goals intentionally no longer author these definitions.
  const response = await page.request.post("/api/direction/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      type: "SAVE_GOAL",
      operationKey: randomUUID(),
      draft: {
        title: goalTitle,
        description: "Imported historical goal",
        startOn: "2026-01-01",
        domainIds: [],
        criterionMode: "ALL",
        criteria: [
          {
            key: "conversation",
            metric: "CONVERSATIONS",
            label: "One useful conversation",
            target: "1",
          },
        ],
      },
    },
  });
  expect(response.ok()).toBe(true);
  const saved = await response.json();
  expect(saved.error).toBeNull();
  await page.goto(`/direction/goals/${saved.id}`);
  await expect(
    page.getByRole("heading", { name: goalTitle, exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Conclude", exact: true }).click();
  const outcome = page.getByRole("combobox", { name: "Conclusion" });
  await outcome.selectOption("ACHIEVED");
  const conclusion = page.getByRole("textbox", {
    name: "What is your honest conclusion from the evidence and experience?",
  });
  await conclusion.fill("I completed the outcome despite the empty reading.");
  await page
    .getByRole("button", { name: "Conclude", exact: true })
    .last()
    .click();
  await expect(outcome).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText(/required criteria have not been established/i, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(conclusion).toHaveValue(
    "I completed the outcome despite the empty reading.",
  );
});

test("an outreach-scoped experiment remains explicit and can be repeated", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  await page.goto("/direction/goals/new");
  const goalTitle = `Protocol goal ${randomUUID().slice(0, 6)}`;
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill(goalTitle);
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page).toHaveURL(/\/direction\/goals\/[^/]+$/);
  await page.goto("/direction/experiments/new");
  const title = `Narrow outreach ${randomUUID().slice(0, 6)}`;
  await page.getByRole("textbox", { name: "Experiment name" }).fill(title);
  await page
    .getByRole("textbox", { name: "Question" })
    .fill("Will a smaller cohort lead to useful conversations?");
  await page
    .getByRole("textbox", { name: "Approach" })
    .fill("Send one clear message, then wait for a directly linked response.");
  await page
    .getByRole("textbox", {
      name: "Stopping condition — optional with a target date",
      exact: true,
    })
    .fill("After the selected cohort has had seven days to respond.");
  await page.locator('[name="startOn"]').fill("2025-01-01");
  await page.locator('[name="targetOn"]').fill("2025-01-31");
  await page.locator("summary").filter({ hasText: "Links & context" }).click();
  await page
    .locator('[name="expectedEvidence"]')
    .fill("A directly linked conversation from the cohort.");
  await page.getByRole("combobox", { name: "Goal this tests" }).fill(goalTitle);
  await page.getByRole("option", { name: new RegExp(goalTitle) }).click();
  await page
    .getByRole("combobox", { name: "Life domains" })
    .fill("Engineering");
  await page.getByRole("option", { name: /Engineering/ }).click();
  await page
    .locator("summary")
    .filter({ hasText: "Optional measurements" })
    .click();
  await page.getByRole("button", { name: "Add evidence definition" }).click();
  await page
    .getByRole("combobox", { name: "Evidence type" })
    .selectOption("CONVERSATIONS");
  await page
    .getByRole("textbox", { name: "Definition label" })
    .fill("Directly linked responses");
  await page.getByRole("textbox", { name: "Target conversations" }).fill("1");
  const outreachOnly = page.getByRole("checkbox", {
    name: /Only conversations linked to this trial’s selected outreach/,
  });
  await outreachOnly.check();
  await expect(outreachOnly).toBeChecked();
  await page.getByRole("button", { name: "Begin experiment" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page
      .getByRole("region", {
        name: "Evidence preview for Directly linked responses",
      })
      .locator("header strong"),
  ).toContainText("Choose this trial's outreach records");
  await page.getByRole("button", { name: "Conclude", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Conclusion" })
    .selectOption("INCONCLUSIVE");
  await page
    .getByRole("textbox", { name: "Result" })
    .fill("No selected outreach was linked to this first setup pass.");
  await page
    .getByRole("textbox", { name: "What you learned" })
    .fill(
      "The cohort must be selected before the result can answer the question.",
    );
  await page
    .getByRole("textbox", {
      name: "What is your honest conclusion from the evidence and experience?",
    })
    .fill("Preserve this as an intentionally inconclusive attempt.");
  const conclude = page
    .getByRole("button", { name: "Conclude", exact: true })
    .last();
  const repeat = page.getByRole("link", { name: "Repeat this attempt" });
  await conclude.click();

  await expect(repeat).toBeVisible();
  const originalId = new URL(page.url()).pathname.split("/").at(-1)!;
  const readAttempt = async (id: string) => {
    const response = await page.request.get(`/api/direction/experiments/${id}`);
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const original = await readAttempt(originalId);
  await repeat.click();
  await expect(
    page.getByText(new RegExp(`fresh attempt after.*${title}`, "i")),
  ).toBeVisible();

  async function expectFreshProtocol() {
    await expect(page.locator('[name="question"]')).toHaveValue(
      original.question,
    );
    await expect(page.locator('[name="approach"]')).toHaveValue(
      original.approach,
    );
    await expect(page.locator('[name="expectedEvidence"]')).toHaveValue(
      original.expectedEvidence,
    );
    await expect(page.locator('[name="stoppingCondition"]')).toHaveValue(
      original.stoppingCondition,
    );
    await expect(
      page.getByRole("combobox", { name: "Goal this tests" }),
    ).toHaveValue(goalTitle);
    await expect(page.locator('[name="domainIds"]')).toHaveValue(
      original.domainIds[0],
    );
    await expect(page.locator('[name="startOn"]')).not.toHaveValue(
      original.startOn,
    );
    await expect(page.locator('[name="targetOn"]')).toHaveValue("");
    await expect(page.locator('[name="sourceInteractionIds"]')).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Definition label" }),
    ).toHaveCount(0);
  }
  await expectFreshProtocol();
  // Exercise the selector independently of the detail-page repeat link.
  await page.goto("/direction/experiments/new");
  await page.locator("summary").filter({ hasText: "Links & context" }).click();
  await page
    .getByRole("combobox", { name: "Repeat a concluded attempt" })
    .fill(title);
  await page.getByRole("option", { name: new RegExp(title) }).click();
  await expectFreshProtocol();
  const repeatedTitle = `${title} · attempt 2`;
  await page.locator('[name="title"]').fill(repeatedTitle);
  await page.getByRole("button", { name: "Begin experiment" }).click();
  await expect(
    page.getByRole("heading", { name: repeatedTitle }),
  ).toBeVisible();
  const repeatedId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(repeatedId).not.toBe(originalId);
  const repeated = await readAttempt(repeatedId);
  expect(repeated).toMatchObject({
    repeatedFromId: originalId,
    question: original.question,
    approach: original.approach,
    expectedEvidence: original.expectedEvidence,
    stoppingCondition: original.stoppingCondition,
    goalId: original.goalId,
    domainIds: original.domainIds,
    status: "ACTIVE",
    result: null,
    learning: null,
    outcome: null,
    concludedAt: null,
    conclusionSnapshot: null,
    criteria: [],
    sourceInteractionIds: [],
  });
  expect(repeated.history).toHaveLength(1);
  expect(repeated.history[0].kind).toBe("REPEATED");
  const after = await readAttempt(originalId);
  // Live evaluation timestamps can change on read; persisted history cannot.
  const { evaluation: beforeEvaluation, ...beforeStored } = original;
  const { evaluation: afterEvaluation, ...afterStored } = after;
  expect(afterStored).toEqual(beforeStored);
  expect(afterEvaluation.fingerprint).toBe(beforeEvaluation.fingerprint);
});

test("an uncertain lifecycle response retries the exact saved operation", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "One transport-level retry check is sufficient.",
  );
  test.setTimeout(90_000);
  await createDisposableDirectionUser(page);
  await page.goto("/direction/experiments/new");
  const title = `Retryable pause ${randomUUID().slice(0, 6)}`;
  await page.getByRole("textbox", { name: "Experiment name" }).fill(title);
  await page
    .getByRole("textbox", { name: "Question" })
    .fill("Can an uncertain response recover without duplicating an action?");
  await page
    .getByRole("textbox", { name: "Approach" })
    .fill("Save one bounded attempt, then pause it once.");
  await page
    .getByRole("textbox", {
      name: "Stopping condition — optional with a target date",
      exact: true,
    })
    .fill("After the pause retry is confirmed.");
  await page.getByRole("button", { name: "Begin experiment" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const reason = page.getByRole("textbox", {
    name: "Why are you setting it down for now?",
  });
  await reason.fill("Pause once while preserving the request identity.");

  const dropPauseResponse = async (route: Route) => {
    const body = route.request().postDataJSON() as {
      type?: string;
      action?: string;
    };
    if (body.type === "DIRECTION_LIFECYCLE" && body.action === "PAUSE") {
      await route.fetch();
      await route.abort("failed");
      return;
    }
    await route.continue();
  };
  await page.route("**/api/direction/commands", dropPauseResponse);
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Could not complete this request|could not save/i }),
  ).toBeVisible();
  await expect(reason).toHaveValue(
    "Pause once while preserving the request identity.",
  );

  await page.unroute("**/api/direction/commands", dropPauseResponse);
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
});
