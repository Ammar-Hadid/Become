import {
  chooseBusinessSource,
  chooseSpecificBusinessOffer,
  openExplorationBusinesses,
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
  await expect(page).toHaveURL(/\/explorations\/[^/]+$/);
  return new URL(page.url()).pathname;
}

test("explorations keep a fresh workspace, relational history and contextual capture across the lifecycle", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
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
  const screenshots = "docs/development/niche-first-qa";
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
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Evidence", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep evidence", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Appointments take an hour to confirm");
  await chooseBusinessSource(page, "Canal Dental");
  await expect(page.locator('select[name="nicheId"]')).toHaveValue(nicheId);
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
  await expect(page).toHaveURL(new RegExp(`${dentists}/interactions/`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Problems", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Frame a problem", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Problem title" })
    .fill("Confirmation overhead");
  await page
    .getByRole("textbox", { name: "What do you believe is happening?" })
    .fill("Manual reminders take time away from reception");
  await expect(page.locator('select[name="nicheId"]')).toHaveValue(nicheId);
  await page.getByRole("button", { name: "Keep this problem" }).click();
  await expect(page).toHaveURL(new RegExp(`${dentists}/problems/`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
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
  await expect(page).toHaveURL(new RegExp(`${dentists}/offers/`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    prisma.offerNiche.count({ where: { userId: user.id, nicheId } }),
  ).resolves.toBe(1);
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entrepreneurship", exact: true }),
  ).toHaveClass(/selected/);
  await page
    .getByText("Business & exploration · optional", { exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Exploration", exact: true }),
  ).toHaveValue(nicheId);
  await page.getByTestId("confirm-start-timer").click();
  await expect(
    page.locator('[data-testid="active-timer-trigger"]:visible'),
  ).toBeVisible();
  const session = await prisma.session.findFirstOrThrow({
    where: { userId: user.id, endedAt: null },
  });
  expect(session.businessNicheId).toBe(nicheId);
  await page.goto(dentists);
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
  await page.getByRole("link", { name: "Explorations", exact: true }).click();
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
  await page.locator('[data-testid="active-timer-trigger"]:visible').click();
  await page.getByRole("dialog").getByTestId("end-session").click();
  await page
    .getByText("Business & exploration · optional", { exact: true })
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
  await page
    .getByRole("combobox", { name: "Business", exact: true })
    .fill("Canal Dental");
  await page.getByRole("option", { name: "Canal Dental", exact: true }).click();
  await page
    .getByRole("button", { name: "Attach to exploration", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Businesses 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Evidence", exact: true })
    .click();
  await expect(page.getByText("No evidence in this view yet.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(
    page.getByText("Confirmation pilot", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Global history", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Entrepreneurship navigation" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirmation pilot", exact: true }),
  ).toBeVisible();
  await page.goto(dentists);
  await expect(
    page.getByRole("link", { name: /^1 Evidence entries/ }),
  ).toBeVisible();
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
        "Pursue this market",
        "Stop exploring",
      ],
    },
    {
      current: "EXPLORING",
      next: "PAUSED",
      labels: [
        "Continue exploring",
        "Pause for now",
        "Pursue this market",
        "Stop exploring",
      ],
    },
    {
      current: "PAUSED",
      next: "PURSUING",
      labels: ["Resume exploring", "Pursue this market", "Stop exploring"],
    },
    {
      current: "PURSUING",
      next: "STOPPED",
      labels: ["Return to exploration", "Pause for now", "Stop exploring"],
    },
    {
      current: "STOPPED",
      next: "EXPLORING",
      labels: ["Resume exploring", "Pursue this market"],
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
    await expect(select).toHaveValue("EXPLORING");
    await select.selectOption(step.next);
    const rationale = `Decision ${index}: ${step.current} to ${step.next}`;
    await dialog
      .getByRole("textbox", { name: "Why this decision?" })
      .fill(rationale);
    await dialog.getByRole("button", { name: "Save direction" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(rationale, { exact: true })).toBeVisible();
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
