import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type Locator,
  type Page,
} from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test.describe("Recurring commitment actions", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15_000);
    email = `recurring-menu-e2e-${randomUUID()}@example.test`;
    await page.goto("/sign-in");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByTestId("name-input").fill("Recurring Menu Tester");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill("recurring-menu-password");
    await page.getByTestId("auth-submit").click();
    await expect(
      page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible();

    await page.goto("/finance/accounts");
    await page.getByRole("button", { name: "Add account" }).click();
    const account = form(page, "Create account & reconcile");
    await account.getByLabel("Account name").fill("Bank");
    await account.getByLabel("Current balance").fill("3000");
    await account
      .getByLabel("Observed at (Amsterdam)")
      .fill("2026-09-06T12:00");
    await save(account, "Create account & reconcile");
  });

  test.afterEach(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const where = { userId: user.id };
    await prisma.financialTransaction.deleteMany({ where });
    await prisma.recurringExpenseOccurrence.deleteMany({ where });
    await prisma.recurringExpense.deleteMany({ where });
    await prisma.financialAccountBalanceSnapshot.deleteMany({ where });
    await prisma.financialAccount.deleteMany({ where });
    await prisma.financeCurrencyPolicy.deleteMany({ where });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("keeps annual cost and polished actions usable across widths", async ({
    page,
  }, testInfo) => {
    await page.goto("/finance/recurring");
    await createCommitment(page, "Monthly plan", "33.49", "MONTHLY");
    await createCommitment(page, "Weekly plan", "10", "WEEKLY");
    await createCommitment(page, "Yearly plan", "125", "YEARLY");

    const monthly = commitment(page, "Monthly plan");
    const weekly = commitment(page, "Weekly plan");
    const yearly = commitment(page, "Yearly plan");
    await expect(monthly).toContainText("EUR 401.88per year");
    await expect(weekly).toContainText("EUR 520.00per year");
    await expect(yearly).toContainText("EUR 125.00per year");

    const monthlyTrigger = monthly.getByRole("button", {
      name: "Actions for Monthly plan",
    });
    await monthlyTrigger.click();
    const monthlyMenu = monthly.getByRole("menu", {
      name: "Actions for Monthly plan",
    });
    await expect(monthlyMenu.getByRole("menuitem")).toHaveText([
      "Edit schedule and terms",
      "Pause recurrence",
      "Archive recurrence",
    ]);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: testInfo.outputPath("commitments-menu-desktop.png"),
      fullPage: true,
    });

    await page.keyboard.press("Escape");
    await expect(monthlyMenu).toBeHidden();
    await expect(monthlyTrigger).toBeFocused();

    await monthlyTrigger.press("ArrowDown");
    await expect(
      monthlyMenu.getByRole("menuitem", { name: "Edit schedule and terms" }),
    ).toBeFocused();
    await page.getByRole("heading", { name: "Your commitments" }).click();
    await expect(monthlyMenu).toBeHidden();

    await monthlyTrigger.click();
    await monthlyMenu
      .getByRole("menuitem", { name: "Edit schedule and terms" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Monthly plan" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close Edit Monthly plan" }).click();
    await expect(monthlyMenu).toBeHidden();
    await expect(monthlyTrigger).toBeFocused();

    await monthlyTrigger.click();
    await monthlyMenu
      .getByRole("menuitem", { name: "Pause recurrence" })
      .click();
    await expect(monthly).toContainText("paused");
    await expect(monthlyMenu).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(monthly).toContainText("EUR 33.49");
    await expect(monthly).toContainText("EUR 401.88per year");
    await monthlyTrigger.click();
    await expect(monthlyMenu).toBeVisible();
    await expect(monthlyMenu).not.toContainText("Saved.");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: testInfo.outputPath("commitments-menu-mobile.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");

    const yearlyTrigger = yearly.getByRole("button", {
      name: "Actions for Yearly plan",
    });
    await yearlyTrigger.click();
    const yearlyMenu = yearly.getByRole("menu", {
      name: "Actions for Yearly plan",
    });
    await yearlyMenu
      .getByRole("menuitem", { name: "Archive recurrence" })
      .click();
    await expect(yearly).toContainText("Archived");
    await expect(yearlyTrigger).toHaveCount(0);
  });
});

function commitment(page: Page, name: string) {
  return page.locator(".finance-recurring-list > article").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

async function createCommitment(
  page: Page,
  name: string,
  amount: string,
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY",
) {
  await page.getByRole("button", { name: "Create schedule" }).click();
  const entry = form(page, "Create recurring expense");
  await entry.getByLabel("Expense name").fill(name);
  await entry.getByLabel("Scheduled amount").fill(amount);
  await entry.getByLabel("Frequency").selectOption(frequency);
  if (frequency === "WEEKLY") {
    await entry.getByLabel("Day of week").selectOption("1");
  } else {
    await entry.getByLabel("Day of month").fill("1");
  }
  if (frequency === "YEARLY") {
    await entry.getByLabel("Month number").fill("1");
  }
  await entry.getByLabel("Start date").fill("2027-01-01");
  await save(entry, "Create recurring expense");
}

function form(page: Page, button: string) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button, exact: true }) });
}

async function save(form: Locator, button: string) {
  await form.getByRole("button", { name: button, exact: true }).click();
  await expect
    .poll(
      async () => {
        if ((await form.count()) === 0 || !(await form.isVisible())) {
          return "complete";
        }
        const status = form.getByRole("status");
        return (await status.count()) > 0 &&
          (await status.textContent()) === "Saved."
          ? "complete"
          : "pending";
      },
      { timeout: 20_000 },
    )
    .toBe("complete");
}
