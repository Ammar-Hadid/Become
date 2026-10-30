import {
  chooseBusinessRecord,
  chooseBusinessSource,
  chooseSpecificBusinessOffer,
  openExplorationBusinesses,
  openExplorationWorkspace,
  expectExplorationCounts,
} from "./utils/entrepreneurship-ui.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  test,
  expect as playwrightExpect,
  type Page,
} from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

const expect = playwrightExpect.configure({ timeout: 15_000 });
test.setTimeout(120_000);

async function startExploration(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Start exploration", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Exploration name", exact: true })
    .fill(name);
  await page
    .getByRole("textbox", { name: "What are you exploring?" })
    .fill(
      name === "Dentists"
        ? "Administrative automation"
        : "Appointment follow-up",
    );
  await page
    .getByRole("button", { name: "Start exploring", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/explorations\/[^/]+\/overview$/);
  return new URL(page.url()).pathname.replace(/\/overview$/, "");
}

test("explorations keep a fresh workspace, relational history and contextual capture across the lifecycle", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(20_000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `exploration-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable exploration QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-exploration-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const screenshots = info.outputPath("niche-first-qa");
  await mkdir(screenshots, { recursive: true });
  await page.goto("/entrepreneurship");
  await expect(
    page.getByRole("heading", { name: "What are you curious about?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Entrepreneurship navigation" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `${screenshots}/${info.project.name}-empty.png`,
    fullPage: true,
  });
  const dentists = await startExploration(page, "Dentists");
  const nicheId = dentists.split("/").at(-1)!;
  await expectExplorationCounts(page, 0);
  await openExplorationBusinesses(page);
  await page.getByRole("button", { name: "Add business", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Dentists" })).toBeChecked();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Canal Dental");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add business", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openExplorationWorkspace(page, "Evidence");
  await page
    .getByRole("button", { name: "Keep evidence", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Appointments take an hour to confirm");
  await chooseBusinessSource(page, "Canal Dental");
  await expect(
    page.getByRole("dialog").locator('[name="nicheId"]'),
  ).toHaveValue(nicheId);
  await page
    .getByRole("button", { name: "Add observation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Statement or behavior" })
    .fill("We spend an hour on confirmations");
  await page
    .getByRole("button", { name: "Save conversation", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open saved conversation →", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${dentists}/conversations/[^/]+$`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openExplorationWorkspace(page, "So Far We Know");
  await expect(
    page.getByRole("heading", { name: "So Far We Know", exact: true }),
  ).toBeVisible();
  await page.goto(`${dentists}/so-far-we-know/problems`);
  await page
    .getByRole("button", { name: "Frame a problem", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Problem title" })
    .fill("Confirmation overhead");
  await page
    .getByRole("textbox", { name: "What do you believe is happening?" })
    .fill("Manual reminders take time away from reception");
  await expect(
    page.getByRole("dialog").locator('[name="nicheId"]'),
  ).toHaveValue(nicheId);
  await page.getByRole("button", { name: "Keep this problem" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${dentists}/so-far-we-know/problems/[^/]+$`),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openExplorationWorkspace(page, "Offers");
  await page
    .getByRole("button", { name: "Shape an offer", exact: true })
    .click();
  await chooseSpecificBusinessOffer(page, "Canal Dental");
  await page
    .getByRole("textbox", { name: "Offer title" })
    .fill("Confirmation pilot");
  await page
    .getByRole("textbox", { name: "Scope & deliverables" })
    .fill("A reminder pilot for the practice");
  await page
    .getByRole("button", { name: "Save draft revision", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${dentists}/offers/[^/]+$`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    prisma.offerNiche.count({ where: { userId: user.id, nicheId } }),
  ).resolves.toBe(1);
  await page
    .getByRole("button", { name: "Start focus", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "What are you working on?" })
      .getByRole("button", { name: "Entrepreneurship", exact: true }),
  ).toHaveClass(/selected/);
  await page
    .getByText("Exploration & business · optional", { exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Exploration", exact: true }),
  ).toHaveValue(nicheId);
  await page.getByTestId("confirm-start-timer").click();
  await expect(
    page.getByRole("button", { name: "End focus session", exact: true }),
  ).toBeVisible();
  const session = await prisma.session.findFirstOrThrow({
    where: { userId: user.id, endedAt: null },
  });
  expect(session.businessNicheId).toBe(nicheId);
  await page.goto(`${dentists}/overview`);
  await expectExplorationCounts(page, 1);
  await page.screenshot({
    path: `${screenshots}/${info.project.name}-dentists.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Review direction", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Work state" })
    .selectOption("STOPPED");
  await page
    .getByRole("textbox", { name: "Why this decision?" })
    .fill("The question needs more thought");
  await page.getByRole("button", { name: "Save direction" }).click();
  await expect(
    page.getByRole("button", { name: "Resume exploration", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to explorations" }).click();
  await expect(
    page
      .getByRole("region", { name: "Past explorations" })
      .getByRole("link", { name: /Dentists/ }),
  ).toBeVisible();
  await startExploration(page, "Barbers");
  await expectExplorationCounts(page, 0);
  await page.screenshot({
    path: `${screenshots}/${info.project.name}-barbers.png`,
    fullPage: true,
  });
  // Opening a running timer from another exploration must keep its original context.
  await page
    .getByRole("button", { name: "End focus session", exact: true })
    .click();
  await page
    .getByText("Exploration & business · optional", { exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Exploration", exact: true }),
  ).toHaveValue(nicheId);
  await page.getByTestId("confirm-stop-timer").click();
  await expect
    .poll(
      async () =>
        (await prisma.session.findUniqueOrThrow({ where: { id: session.id } }))
          .endedAt,
    )
    .not.toBeNull();
  await openExplorationBusinesses(page);
  await page
    .getByRole("button", { name: "Attach existing business", exact: true })
    .click();
  await chooseBusinessRecord(page, "Business", "Canal Dental");
  await page
    .getByRole("button", { name: "Attach to exploration", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Businesses 1", exact: true }),
  ).toBeVisible();
  await openExplorationWorkspace(page, "Evidence");
  await expect(page.getByText("No evidence in this view yet.")).toBeVisible();
  await openExplorationWorkspace(page, "Offers");
  await expect(
    page.getByText("Confirmation pilot", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Back to explorations" }).click();
  await page
    .getByRole("link", { name: "Global history ↗", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Entrepreneurship navigation" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirmation pilot", exact: true }),
  ).toBeVisible();
  await page.goto(`${dentists}/overview`);
  await expectExplorationCounts(page, 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Resume exploration", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Resume exploration", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Workspace navigation must leave account and timer controls accessible on
  // shorter screens through the approved shared header.
  await page.setViewportSize({ width: 1280, height: 600 });
  await expect(
    page.locator('[data-testid="start-timer-trigger"]:visible'),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("button", { name: "Account", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await openExplorationWorkspace(page, "Offers");
  await expect(page).toHaveURL(`${dentists}/offers`);
  await expect(
    page.getByRole("heading", { name: "Confirmation pilot", exact: true }),
  ).toBeVisible();
  const explorationTitle = page.getByRole("heading", {
    name: "Dentists",
    level: 1,
  });
  expect(
    await explorationTitle.evaluate(
      (element) =>
        element.getBoundingClientRect().height /
        Number.parseFloat(getComputedStyle(element).lineHeight),
    ),
  ).toBeLessThan(1.5);
  await page.screenshot({
    path: info.outputPath("short-desktop-navigation.png"),
    animations: "disabled",
  });

  await page.setViewportSize({ width: 390, height: 600 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const account = page.getByRole("button", { name: "Account", exact: true });
  await expect(account).toBeInViewport({ ratio: 1 });
  await account.click();
  await expect(page.getByRole("menu", { name: "Account" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await openExplorationWorkspace(page, "Overview");
  await expect(page).toHaveURL(`${dentists}/overview`);
  await expect(
    page.locator('[data-testid="start-timer-trigger"]:visible'),
  ).toBeInViewport({ ratio: 1 });
});

test("direction review offers contextual choices and preserves explicit continue decisions", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `direction-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable direction QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-exploration-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/entrepreneurship");
  const path = await startExploration(page, "Direction review");
  const nicheId = path.split("/").at(-1)!;
  const initialDecisions = await prisma.nicheDecision.count({
    where: { nicheId },
  });
  const cases = [
    {
      current: "EXPLORING",
      next: "EXPLORING",
      labels: [
        "Continue exploring",
        "Pause for now",
        "Pursue this exploration",
        "Stop exploring",
      ],
    },
    {
      current: "EXPLORING",
      next: "PAUSED",
      labels: [
        "Continue exploring",
        "Pause for now",
        "Pursue this exploration",
        "Stop exploring",
      ],
    },
    {
      current: "PAUSED",
      next: "PURSUING",
      labels: [
        "Resume exploring",
        "Pause for now",
        "Pursue this exploration",
        "Stop exploring",
      ],
    },
    {
      current: "PURSUING",
      next: "STOPPED",
      labels: [
        "Return to exploration",
        "Pause for now",
        "Pursue this exploration",
        "Stop exploring",
      ],
    },
    {
      current: "STOPPED",
      next: "EXPLORING",
      labels: [
        "Resume exploring",
        "Pause for now",
        "Pursue this exploration",
        "Stop exploring",
      ],
    },
  ];
  for (const [index, step] of cases.entries()) {
    const active = ["EXPLORING", "PURSUING"].includes(step.current);
    await page
      .getByRole("button", {
        name: active ? "Review direction" : "Resume exploration",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Where is this leading?",
    });
    await expect(dialog).toBeVisible();
    const select = dialog.getByRole("combobox", { name: "Work state" });
    await expect(select.locator("option")).toHaveText(step.labels);
    await expect(select).toHaveValue(step.current);
    await select.selectOption(step.next);
    const rationale = `Decision ${index}: ${step.current} to ${step.next}`;
    await dialog
      .getByRole("textbox", { name: "Why this decision?" })
      .fill(rationale);
    await dialog.getByRole("button", { name: "Save direction" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".exploration-masthead-status")).toContainText(
      step.next.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
    );
    const niche = await prisma.niche.findUniqueOrThrow({
      where: { id: nicheId },
    });
    expect(niche.direction).toBe(step.next);
    expect(await prisma.nicheDecision.count({ where: { nicheId } })).toBe(
      initialDecisions + index + 1,
    );
    expect(
      await prisma.nicheDecision.count({
        where: { nicheId, direction: step.next, rationale },
      }),
    ).toBe(1);
  }
});
