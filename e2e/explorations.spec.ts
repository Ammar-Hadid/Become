import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

async function startExploration(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Start exploration", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Market name", exact: true })
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
  await expect(page).toHaveURL("/");
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
  for (const label of ["Companies", "Interactions", "Problems", "Offers"])
    await expect(
      page.getByRole("link", { name: `0 ${label}`, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Companies", exact: true })
    .click();
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Dentists" })).toBeChecked();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Canal Dental");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add company", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Interactions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Appointments take an hour to confirm");
  await page
    .getByRole("combobox", { name: "Company — optional" })
    .fill("Canal Dental");
  await page.getByRole("option", { name: "Canal Dental", exact: true }).click();
  await expect(page.locator('select[name="nicheId"]')).toHaveValue(nicheId);
  await page
    .getByRole("button", { name: "Add observation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Statement or behavior" })
    .fill("We spend an hour on confirmations");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
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
  await page
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption({ label: "Canal Dental" });
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
  await page.getByText("Company & niche · optional", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Niche", exact: true }),
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
  for (const label of ["Companies", "Interactions", "Problems", "Offers"])
    await expect(
      page.getByRole("link", { name: `1 ${label}`, exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/${info.project.name}-dentists.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Pause or stop", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Next direction" })
    .selectOption("STOPPED");
  await page
    .getByRole("textbox", { name: "Why this decision?" })
    .fill("The question needs more thought");
  await page.getByRole("button", { name: "Save direction" }).click();
  await expect(
    page.getByRole("button", { name: "Resume exploration", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Explorations", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Past explorations" })
      .getByRole("link", { name: /Dentists/ }),
  ).toBeVisible();
  await startExploration(page, "Barbers");
  for (const label of ["Companies", "Interactions", "Problems", "Offers"])
    await expect(
      page.getByRole("link", { name: `0 ${label}`, exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/${info.project.name}-barbers.png`,
    fullPage: true,
  });
  // Opening a running timer from another exploration must keep its original context.
  await page.locator('[data-testid="active-timer-trigger"]:visible').click();
  await page.getByText("Company & niche · optional", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Niche", exact: true }),
  ).toHaveValue(nicheId);
  await page.getByTestId("confirm-stop-timer").click();
  await expect
    .poll(
      async () =>
        (await prisma.session.findUniqueOrThrow({ where: { id: session.id } }))
          .endedAt,
    )
    .not.toBeNull();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Companies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add existing company", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Company", exact: true })
    .fill("Canal Dental");
  await page.getByRole("option", { name: "Canal Dental", exact: true }).click();
  await page
    .getByRole("button", { name: "Add to exploration", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Companies 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Interactions", exact: true })
    .click();
  await expect(
    page.getByText("No interactions recorded here yet."),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(
    page.getByText("Confirmation pilot", { exact: true }),
  ).toHaveCount(0);
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
  await page.goto(dentists);
  await expect(
    page.getByRole("link", { name: "1 Interactions", exact: true }),
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
