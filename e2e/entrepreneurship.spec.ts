import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import "dotenv/config";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { saveFinancialTransaction } from "../src/features/finance/transactions/services/financial-transaction.service";
import { createProblem } from "../src/features/entrepreneurship/problems/services/problem.service";
import { expect, test, type Page } from "./utils/browser-test.util";
import { randomUUID } from "node:crypto";

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable Entrepreneurship QA");
  const email = `phase4-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-phase4-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}
async function logConversation(page: Page) {
  await page.goto("/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Operations lead described their Friday handover.");
  await page
    .getByRole("combobox", { name: "Company — optional" })
    .fill("Harbor QA");
  await page
    .getByRole("option", { name: /Add “Harbor QA” with this record/ })
    .click();
  await page
    .getByRole("button", { name: "Add observation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Statement or behavior" })
    .fill("We lose two hours every Friday reconciling delivery spreadsheets.");
  await page
    .getByRole("combobox", { name: "Wording", exact: true })
    .selectOption("QUOTE");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Harbor QA", exact: true }),
  ).toBeVisible();
}
test("market voice becomes traceable evidence, a scoped judgment and a recurring quote", async ({
  page,
}) => {
  await signUp(page);
  await logConversation(page);
  await page.goto("/entrepreneurship/problems");
  await page
    .getByRole("button", { name: "Frame a problem", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Problem title" })
    .fill("Friday handover friction");
  await page
    .getByRole("textbox", { name: "What do you believe is happening?" })
    .fill(
      "Small logistics teams may lose time reconciling late delivery changes.",
    );
  await page.getByRole("button", { name: "Keep this problem" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Friday handover friction",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Link an observation", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Observation", exact: true })
    .selectOption({
      label:
        "Harbor QA · We lose two hours every Friday reconciling delivery spreadsheets.",
    });
  await page
    .getByRole("combobox", { name: "What does it add?" })
    .selectOption("SUPPORTS");
  await page
    .getByRole("textbox", { name: "Your interpretation" })
    .fill(
      "One reported experience. It supports investigating time cost at this company.",
    );
  await page.getByRole("button", { name: "Link source", exact: true }).click();
  await expect(
    page.getByText(/1 source links · 1 companies represented/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Assessment", exact: true })
    .selectOption("SUPPORTED_FOR_SCOPE");
  await page
    .getByRole("textbox", { name: "Scope of this judgment" })
    .fill("Harbor QA’s weekly handover, based on one reported account.");
  await page
    .getByRole("textbox", { name: "Reasoning", exact: true })
    .fill(
      "The time cost is reported. Its prevalence elsewhere remains unknown.",
    );
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record judgment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Judgments over time" }),
  ).toBeVisible();
  await page.goto("/entrepreneurship/offers");
  await page
    .getByRole("button", { name: "Shape an offer", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption({ label: "Harbor QA" });
  await page
    .getByRole("textbox", { name: "Offer title" })
    .fill("A calmer Friday handover");
  await page
    .getByRole("textbox", { name: "Scope & deliverables" })
    .fill("One shared handover and a monthly operations check-in.");
  await page
    .getByRole("combobox", { name: "Pricing basis" })
    .selectOption("RECURRING");
  await page.getByRole("textbox", { name: "Amount", exact: false }).fill("300");
  await page.getByRole("button", { name: "Save draft revision" }).click();
  await expect(
    page.getByRole("heading", { name: "EUR 300.00 every 1 month" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No receipts attributed. Accepted terms are not received income.",
    ),
  ).toBeVisible();
});
test("failed saves preserve entries, keyboard dismissal restores focus and reduced motion stays usable", async ({
  page,
}) => {
  await signUp(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/entrepreneurship/interactions");
  const trigger = page.getByRole("button", {
    name: "Log interaction",
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("A record worth preserving through a network error.");
  await page.route("**/entrepreneurship/interactions", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /Could not save/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Summary", exact: true }),
  ).toHaveValue("A record worth preserving through a network error.");
  await page.unroute("**/entrepreneurship/interactions");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Log interaction", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("entrepreneurship timer completion is authoritative and capture remains optional", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/entrepreneurship");
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page
    .getByRole("button", { name: "Entrepreneurship", exact: true })
    .click();
  await page
    .getByTestId("activity-select")
    .selectOption({ label: "Outreach preparation" });
  await page
    .getByTestId("session-description")
    .fill("Prepare outreach questions");
  await page.getByTestId("confirm-start-timer").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator('[data-testid="active-timer-trigger"]:visible').click();
  await page.getByRole("dialog").getByTestId("end-session").click();
  await page.getByTestId("session-outcome").fill("A clearer introduction");
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Session saved" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Session saved" }),
  ).toHaveCount(0);
  await page.goto("/entrepreneurship/interactions");
  await expect(
    page.getByRole("heading", { name: "No interactions recorded here yet." }),
  ).toBeVisible();
});

test("business receipt attribution remains one Finance fact and deletion withdraws its evidence", async ({
  page,
}) => {
  const userId = await signUp(page);
  const company = await prisma.company.create({
    data: { userId, name: "Receipt QA", normalizedName: "receipt qa" },
  });
  const account = await prisma.financialAccount.create({
    data: { userId, name: "QA checking", currency: "EUR", type: "CHECKING" },
  });
  const input = {
    type: "INCOME",
    inflowKind: "BUSINESS_REVENUE",
    accountId: account.id,
    currency: "EUR",
    amount: "100",
    occurredAt: "2026-09-01T12:00",
  };
  const receipt = await saveFinancialTransaction(userId, input);
  const problem = await createProblem(userId, randomUUID(), {
    title: "Willingness to pay for the pilot",
    initialStatement: "This company may pay for a small pilot.",
    origin: "USER_HYPOTHESIS",
  });
  await page.goto(`/finance/transactions/${receipt.id}`);
  await page
    .getByRole("button", { name: "Attribute receipt", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption(company.id);
  await page
    .getByRole("textbox", { name: "Amount of this receipt (EUR)", exact: true })
    .fill("100");
  await page
    .getByRole("button", { name: "Confirm attribution", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      "EUR 100.00 attributed · EUR 0.00 not attributed to a company",
    ),
  ).toBeVisible();
  await saveFinancialTransaction(
    userId,
    { ...input, occurredAt: "2026-09-02T12:00" },
    receipt.id,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Review attribution", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm attribution still holds",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`/entrepreneurship/problems/${problem.id}`);
  await page
    .getByRole("button", { name: "Link a receipt", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Confirmed receipt attribution" })
    .selectOption({ label: "Receipt QA · EUR 100.00" });
  await page
    .getByRole("combobox", { name: "What does it add?" })
    .selectOption("SUPPORTS");
  await page
    .getByRole("textbox", { name: "Your interpretation" })
    .fill(
      "An actual deposit for this pilot; it does not establish wider demand or profitability.",
    );
  await page
    .getByRole("button", { name: "Link receipt evidence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      /EUR 100.00 attributed to Receipt QA from income received 2 Sep 2026/,
    ),
  ).toBeVisible();
  await page.goto(`/finance/transactions/${receipt.id}`);
  await page.getByText("Delete as a correction", { exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm transaction deletion", exact: true })
    .click();
  await expect(page).toHaveURL(/\/finance\/transactions$/);
  await page.goto(`/entrepreneurship/problems/${problem.id}`);
  await expect(
    page.getByText("Source withdrawn", { exact: true }),
  ).toBeVisible();
});

test("small batch outreach records recipients once and remains usable during a slow save", async ({
  page,
}) => {
  const userId = await signUp(page);
  await prisma.company.createMany({
    data: [
      { userId, name: "North QA", normalizedName: "north qa" },
      { userId, name: "South QA", normalizedName: "south qa" },
    ],
  });
  await page.goto("/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Record batch outreach", exact: true })
    .click();
  for (const name of ["North QA", "South QA"]) {
    await page
      .getByRole("combobox", { name: "Find recipients", exact: true })
      .fill(name);
    await page.getByRole("option", { name, exact: true }).click();
  }
  await page
    .getByRole("textbox", { name: "Shared summary" })
    .fill("Sent a short introduction asking about the handover.");
  await page.getByRole("checkbox", { name: /I actually sent/ }).check();
  await page.route("**/entrepreneurship/interactions", async (route) => {
    if (route.request().method() === "POST")
      await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Record sent outreach", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Record sent outreach", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Sent a short introduction asking about the handover.",
    }),
  ).toHaveCount(2);
  expect(await prisma.interaction.count({ where: { userId } })).toBe(2);
});

test("company search keeps a stable five-row results viewport", async ({
  page,
}) => {
  const userId = await signUp(page);
  await prisma.company.createMany({
    data: Array.from({ length: 26 }, (_, index) => {
      const suffix = String(index).padStart(2, "0");
      return {
        userId,
        name: `Stable Company ${suffix}`,
        normalizedName: `stable company ${suffix}`,
      };
    }),
  });
  await page.goto("/entrepreneurship/market");
  const results = page.locator(".business-company-results");
  await expect(page.locator(".business-company-row")).toHaveCount(25);
  await expect(results).toBeVisible();
  const initialHeight = await results.evaluate(
    (element) => element.clientHeight,
  );
  await page.getByRole("searchbox", { name: "Search companies" }).fill("00");
  await expect(
    page.getByRole("link", { name: /Stable Company 00/ }),
  ).toBeVisible();
  await expect(results).toHaveJSProperty("clientHeight", initialHeight);
  await page
    .getByRole("searchbox", { name: "Search companies" })
    .fill("does not exist");
  await expect(
    page.getByRole("heading", { name: "No companies match that search." }),
  ).toBeVisible();
  await expect(results).toHaveJSProperty("clientHeight", initialHeight);
});

test("company edits, browser Back and archived problem history remain navigable", async ({
  page,
}) => {
  const userId = await signUp(page);
  await logConversation(page);
  const company = await prisma.company.findFirstOrThrow({ where: { userId } });
  await page.goto(`/entrepreneurship/market/companies/${company.id}`);
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Harbor QA renamed");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Harbor QA renamed", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Entrepreneurship navigation" })
    .getByRole("link", { name: "Market", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrepreneurship\/market$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Harbor QA renamed", exact: true }),
  ).toBeVisible();
  const problem = await createProblem(userId, randomUUID(), {
    title: "Retained question",
    initialStatement: "Is the handover difficult?",
    origin: "USER_HYPOTHESIS",
  });
  await page.goto(`/entrepreneurship/problems/${problem.id}`);
  await page
    .getByRole("button", { name: "problem actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Archive problem", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Problem archived." }),
  ).toHaveText("Problem archived.");
  await page.goto("/entrepreneurship/problems");
  await expect(
    page.getByRole("link", { name: /Retained question/ }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "View archived", exact: true }).click();
  await page.getByRole("link", { name: /Retained question/ }).click();
  await expect(
    page.getByText("Is the handover difficult?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "problem actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Restore problem", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Problem restored." }),
  ).toHaveText("Problem restored.");
  await page.goto("/entrepreneurship/problems");
  await expect(
    page.getByRole("link", { name: /Retained question/ }),
  ).toBeVisible();
});
