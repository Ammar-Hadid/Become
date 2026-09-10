import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type Page,
  type Locator,
} from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test.describe("Phase 3 Finance", () => {
  let email: string;
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
    email = `finance-e2e-${randomUUID()}@example.test`;
    await page.goto("/sign-in");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByTestId("name-input").fill("Finance Tester");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill("finance-test-password");
    await page.getByTestId("auth-submit").click();
    await expect(
      page.getByRole("heading", { name: /Finance\./ }),
    ).toBeVisible();
  });
  test.afterEach(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const where = { userId: user.id };
    await prisma.paymentSessionAllocation.deleteMany({ where });
    await prisma.savingsGoalExpenseAllocation.deleteMany({ where });
    await prisma.financialTransaction.deleteMany({ where });
    await prisma.recurringExpenseOccurrence.deleteMany({ where });
    await prisma.recurringExpense.deleteMany({ where });
    await prisma.session.deleteMany({ where });
    await prisma.incomeOpportunity.deleteMany({ where });
    await prisma.workSource.deleteMany({ where });
    await prisma.savingsGoal.deleteMany({ where });
    await prisma.financialAccountBalanceSnapshot.deleteMany({ where });
    await prisma.financialAccount.deleteMany({ where });
    await prisma.expenseCategory.deleteMany({ where });
    await prisma.counterparty.deleteMany({ where });
    await prisma.financeCurrencyPolicy.deleteMany({ where });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("accounts, transfer, reserve, goal spending and underfunding remain distinct", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await addAccount(page, "Savings", "5000", true);
    await addAccount(page, "Checking", "1000", false);
    await page.goto("/finance/accounts");
    await page.getByRole("link", { name: /^Savings Included/ }).click();
    await page
      .getByRole("button", { name: "Update actual balance", exact: true })
      .click();
    const reconcile = form(page, "Record observed balance");
    await reconcile.getByLabel(/Reconciled balance/).fill("5500");
    await reconcile
      .getByLabel("Observed at (Amsterdam)")
      .fill("2026-01-02T12:00");
    await save(reconcile, "Record observed balance");
    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const transfer = form(page, "Record transaction");
    await transfer.getByLabel("Transaction type").selectOption("TRANSFER");
    await expect(transfer.getByLabel("Counterparty")).toHaveCount(0);
    await transfer
      .getByLabel("From account", { exact: true })
      .selectOption({ label: "Checking · EUR" });
    await expect(transfer).toContainText(
      "Available recorded balance: EUR 1,000.00",
    );
    await transfer.getByLabel(/Amount \(EUR\)/).fill("1000.01");
    await expect(transfer.getByRole("alert")).toContainText(
      "exceeds the source account's available recorded balance",
    );
    await transfer.getByLabel(/Amount \(EUR\)/).fill("200");
    await transfer.getByLabel("To account").selectOption({ label: "Savings" });
    await save(transfer, "Record transaction");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/finance/);
    await expect(
      page.getByRole("navigation", { name: "Settings sections" }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Configure currency reserve",
        exact: true,
      })
      .click();
    const reserve = form(page, "Save reserve");
    await reserve.getByLabel("Protected reserve", { exact: true }).fill("3000");
    await save(reserve, "Save reserve", false);
    await expect(page.getByLabel("Protected reserve (EUR)")).toHaveValue(
      "3000.00",
    );
    await page.goto("/finance/savings");
    await createGoal(page, "Gaming PC", "2500");
    await createGoal(page, "Car", "5000");
    await page.getByText("Rebalance EUR allocations", { exact: true }).click();
    const rebalance = form(page, "Confirm allocation plan");
    await rebalance.getByLabel("Gaming PC allocation (EUR)").fill("1500");
    await rebalance.getByLabel("Car allocation (EUR)").fill("1000");
    await save(rebalance, "Confirm allocation plan");
    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const expense = form(page, "Record transaction");
    await expense
      .getByLabel("Account", { exact: true })
      .selectOption({ label: "Savings · EUR" });
    await expense.getByLabel(/Amount \(EUR\)/).fill("500");
    await expense.getByLabel("Counterparty").fill("Emergency");
    await expense.getByRole("option", { name: "Create “Emergency”" }).click();
    await save(expense, "Record transaction");
    await page.goto("/finance/savings");
    await expect(
      page.getByText(/Goal plan exceeds available capacity by EUR 300.00/),
    ).toBeVisible();
    await page.getByText("Rebalance EUR allocations", { exact: true }).click();
    const replan = form(page, "Confirm allocation plan");
    await expect(replan.getByLabel("Gaming PC allocation (EUR)")).toHaveValue(
      "1500.00",
    );
    await replan.getByLabel("Car allocation (EUR)").fill("700");
    await save(replan, "Confirm allocation plan");
    await page.getByRole("link", { name: /^Gaming PC/ }).click();
    await page.getByText("Add goal purchase", { exact: true }).click();
    const purchase = form(page, "Record transaction");
    await purchase.getByLabel(/Amount \(EUR\)/).fill("700");
    await purchase
      .getByLabel("Amount of this expense that counts toward the goal")
      .fill("500");
    await purchase.getByLabel(/Reduce current savings allocation/).fill("700");
    await save(purchase, "Record transaction");
    const funding = page
      .getByRole("heading", { name: "Goal funding and spending" })
      .locator("..");
    await expect(funding).toContainText("EUR 2,500.00");
    await expect(funding).toContainText("EUR 500.00");
    await expect(funding).toContainText("EUR 2,000.00");
    await expect(funding).toContainText("EUR 800.00");
    await page.goto("/finance");
    await expect(
      page.getByText("Current recorded position", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cash movement" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("finance-overview.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/domains/finance?timeframe=week");
    await expect(page).toHaveURL(/\/finance\?timeframe=week/);
  });

  test("presents reserve shortfall as reality and underfunding as a goal-plan issue", async ({
    page,
  }) => {
    await addAccount(page, "Savings", "3400", true);
    await page.goto("/settings/finance");
    await page
      .getByRole("button", {
        name: "Configure currency reserve",
        exact: true,
      })
      .click();
    const reserve = form(page, "Save reserve");
    await reserve.getByLabel("Protected reserve", { exact: true }).fill("3000");
    await save(reserve, "Save reserve", false);

    await page.goto("/finance/savings");
    await createGoal(page, "Future plan", "1000");
    await page.getByText("Rebalance EUR allocations", { exact: true }).click();
    const rebalance = form(page, "Confirm allocation plan");
    await rebalance.getByLabel("Future plan allocation (EUR)").fill("400");
    await save(rebalance, "Confirm allocation plan");

    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const expense = form(page, "Record transaction");
    await expense.getByLabel(/Amount \(EUR\)/).fill("2511.61");
    await expense.getByLabel("Counterparty").fill("Unexpected expense");
    await expense
      .getByRole("option", { name: "Create “Unexpected expense”" })
      .click();
    await save(expense, "Record transaction");

    await page.goto("/finance/savings");
    const reality = page
      .getByRole("heading", { name: "Savings direction" })
      .locator("../../..");
    await expect(reality).toContainText("Reserve not yet covered");
    await expect(reality).toContainText(
      "You're EUR 2,111.61 below your EUR 3,000.00 protected reserve.",
    );
    await expect(
      reality.getByRole("img", {
        name: /29.6% of the EUR 3,000.00 protected reserve is covered/,
      }),
    ).toBeVisible();
    await expect(reality).not.toContainText(
      "Goal plan exceeds available capacity",
    );

    const goals = page
      .getByRole("heading", { name: "Savings goals" })
      .locator("../../..");
    await expect(goals).toContainText(
      "Goal plan exceeds available capacity by EUR 400.00",
    );
    await expect(goals).toContainText(
      "there is currently no savings above the reserve available to fund them",
    );

    await page.goto("/finance");
    const savingsSnapshot = page
      .getByRole("heading", {
        name: "What your savings are holding space for",
      })
      .locator("../../..");
    await expect(
      savingsSnapshot.getByRole("img", {
        name: /29.6% of the EUR 3,000.00 protected reserve is covered/,
      }),
    ).toBeVisible();
    await expect(savingsSnapshot).toContainText("29.6% of reserve covered");
    await expect(savingsSnapshot).toContainText("Reserve not yet covered");
    await expect(savingsSnapshot).toContainText(
      "EUR 2,111.61 still needed to reach the protected reserve.",
    );
  });

  test("recurring confirmation/automatic posting and payment-first work attribution", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    await addAccount(page, "Bank", "3000", true);
    await page.goto("/finance/recurring");
    await page.getByText("Create schedule", { exact: true }).click();
    const recurring = form(page, "Create recurring expense");
    await recurring.getByLabel("Expense name").fill("Monthly 31st");
    await recurring.getByLabel("Counterparty").fill("Service provider");
    await recurring
      .getByRole("option", { name: "Create “Service provider”", exact: true })
      .click();
    await recurring.getByLabel("Scheduled amount").fill("25");
    await recurring.getByLabel("Category").fill("Subscriptions");
    await recurring
      .getByRole("option", { name: "Create “Subscriptions”", exact: true })
      .click();
    await recurring.getByLabel("Day of month").fill("31");
    await recurring.getByLabel("Start date").fill("2026-08-01");
    await recurring.getByLabel("End date (optional)").fill("2026-08-31");
    await save(recurring, "Create recurring expense");
    await page
      .getByRole("button", { name: "Check due expenses", exact: true })
      .click();
    await expect(
      page.getByText("Confirm or adjust expense", { exact: true }),
    ).toBeVisible();
    await page.getByText("Confirm or adjust expense", { exact: true }).click();
    const confirm = form(page, "Record transaction");
    await expect(confirm.getByLabel("Counterparty")).toHaveValue(
      "Service provider",
    );
    await expect(confirm.getByLabel("Category")).toHaveValue("Subscriptions");
    await confirm.getByLabel(/Amount \(EUR\)/).fill("27");
    await save(confirm, "Record transaction", false);
    await expect(page.getByText(/Recorded EUR 27.00/)).toBeVisible();
    await page.getByText("Create schedule", { exact: true }).click();
    const automatic = form(page, "Create recurring expense");
    await automatic.getByLabel("Expense name").fill("Automatic bill");
    await automatic.getByLabel("Counterparty").fill("service");
    await automatic
      .getByRole("option", { name: "Service provider", exact: true })
      .click();
    await automatic.getByLabel("Scheduled amount").fill("25");
    await automatic.getByLabel("Category").fill("sub");
    await automatic
      .getByRole("option", { name: "Subscriptions", exact: true })
      .click();
    await automatic.getByLabel("Day of month").fill("31");
    await automatic.getByLabel("Start date").fill("2026-08-01");
    await automatic.getByLabel("End date (optional)").fill("2026-08-31");
    await automatic.getByLabel("Posting behavior").selectOption("AUTOMATIC");
    await save(automatic, "Create recurring expense");
    await page
      .getByRole("button", { name: "Check due expenses", exact: true })
      .click();
    await expect(
      page.getByText(/Automatic bill · 2026-08-31 · POSTED AUTOMATICALLY/),
    ).toBeVisible();
    await page.goto("/finance/opportunities");
    await page.getByText("Add opportunity", { exact: true }).click();
    const opportunity = form(page, "Save opportunity");
    await opportunity.getByLabel("Opportunity title").fill("Client engagement");
    await opportunity
      .getByLabel("Organization", { exact: true })
      .fill("Client Alpha");
    await opportunity
      .getByLabel("Status", { exact: true })
      .selectOption("ACCEPTED");
    await save(opportunity, "Save opportunity", false);
    await expect(
      page.getByRole("heading", { name: "Accepted. Choose what comes next." }),
    ).toBeVisible();
    await page.getByText("Create WorkSource", { exact: true }).click();
    const source = form(page, "Confirm create work source");
    await expect(source.getByLabel("Work source name")).toHaveValue(
      "Client Alpha",
    );
    await source.getByLabel("Source type").selectOption("CLIENT");
    await save(source, "Confirm create work source", false);
    await expect(
      page.getByText("Resulting work source: Client Alpha", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.locator('[data-testid="start-timer-trigger"]:visible').click();
    await page.getByRole("button", { name: "Finance", exact: true }).click();
    await page
      .getByTestId("activity-select")
      .selectOption({ label: "Paid work" });
    await page
      .getByLabel("Work source (optional)")
      .selectOption({ label: "Client Alpha" });
    await page
      .getByRole("dialog")
      .getByLabel("Compensation type", { exact: true })
      .selectOption("HOURLY");
    await page.getByTestId("session-description").fill("Client delivery");
    await page.getByTestId("confirm-start-timer").click();
    await expect(
      page.locator('[data-testid="active-timer-trigger"]:visible'),
    ).toBeVisible();
    await page.locator('[data-testid="active-timer-trigger"]:visible').click();
    await expect(page.getByRole("dialog")).not.toContainText("payment");
    await page.getByTestId("confirm-stop-timer").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.locator('[data-testid="active-timer-trigger"]:visible'),
    ).toHaveCount(0);
    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const payment = form(page, "Record transaction");
    await payment.getByLabel("Transaction type").selectOption("INCOME");
    await payment.getByLabel(/Amount \(EUR\)/).fill("120");
    await payment
      .getByLabel("Inflow classification")
      .selectOption("EARNED_WORK");
    await payment.getByLabel("Counterparty").fill("Client payment");
    await payment
      .getByRole("option", { name: "Create “Client payment”", exact: true })
      .click();
    await save(payment, "Record transaction");
    await page
      .getByRole("link", { name: "Payment saved. Review payment details." })
      .click();
    await expect(
      page.getByRole("heading", { name: "Link this payment to work" }),
    ).toBeVisible();
    const allocation = form(page, "Confirm payment attribution");
    await allocation.getByRole("checkbox", { name: /Client delivery/ }).check();
    await allocation.getByLabel("Amount for Client delivery (EUR)").fill("100");
    await allocation
      .getByLabel("Are selected sessions fully accounted for?")
      .selectOption("yes");
    await save(allocation, "Confirm payment attribution");
    await expect(
      allocation.getByText("Still unassigned").locator(".."),
    ).toContainText("EUR 20.00");
    await page.screenshot({
      path: testInfo.outputPath("finance-attribution.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/finance");
    await expect(
      page.getByText(/Earned-work payment has EUR 20.00 unallocated/),
    ).toBeVisible();
  });

  test("skips a recurring occurrence, defers acceptance and later links an existing source", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await addAccount(page, "Bank", "1000", true);
    await page.goto("/finance/recurring");
    await page.getByText("Create schedule", { exact: true }).click();
    const schedule = form(page, "Create recurring expense");
    await schedule.getByLabel("Expense name").fill("Cancelled subscription");
    await schedule.getByLabel("Scheduled amount").fill("10");
    await schedule.getByLabel("Day of month").fill("31");
    await schedule.getByLabel("Start date").fill("2026-08-01");
    await schedule.getByLabel("End date (optional)").fill("2026-08-31");
    await save(schedule, "Create recurring expense");
    await page
      .getByRole("button", { name: "Check due expenses", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Skip expense", exact: true })
      .click();
    await expect(
      page.getByText(/Cancelled subscription · 2026-08-31 · SKIPPED/),
    ).toBeVisible();
    await page.goto("/finance/opportunities");
    await page.getByText("Add work source", { exact: true }).click();
    const source = form(page, "Confirm create work source");
    await source.getByLabel("Work source name").fill("Existing client");
    await save(source, "Confirm create work source");
    await page.getByText("Add opportunity", { exact: true }).click();
    const opportunity = form(page, "Save opportunity");
    await opportunity
      .getByLabel("Opportunity title")
      .fill("Deferred next project");
    await opportunity
      .getByLabel("Status", { exact: true })
      .selectOption("ACCEPTED");
    await save(opportunity, "Save opportunity", false);
    await page.getByRole("link", { name: "Not now", exact: true }).click();
    await page.getByRole("link", { name: /Deferred next project/ }).click();
    await page.getByText("Link existing WorkSource", { exact: true }).click();
    const link = form(page, "Confirm link");
    await link
      .getByLabel("Existing work source")
      .selectOption({ label: "Existing client" });
    await save(link, "Confirm link", false);
    await expect(
      page.getByText("Resulting work source: Existing client", { exact: true }),
    ).toBeVisible();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await prisma.workSource.count({ where: { userId: user.id } })).toBe(
      1,
    );
    expect(
      await prisma.financialTransaction.count({ where: { userId: user.id } }),
    ).toBe(0);
    await page.locator('[data-testid="start-timer-trigger"]:visible').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.locator('[data-testid="start-timer-trigger"]:visible'),
    ).toBeFocused();
  });

  test("creates and reuses a transaction counterparty inline", async ({
    page,
  }) => {
    await addAccount(page, "Bank", "1000", true);
    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const first = form(page, "Record transaction");
    await first.getByLabel(/Amount \(EUR\)/).fill("10");
    await first.getByLabel("Counterparty").fill("Dirk");
    await expect(
      first.getByRole("option", { name: "Create “Dirk”", exact: true }),
    ).toBeVisible();
    await first
      .getByRole("option", { name: "Create “Dirk”", exact: true })
      .click();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await expect
      .poll(() => prisma.counterparty.count({ where: { userId: user.id } }))
      .toBe(1);
    await save(first, "Record transaction");

    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const second = form(page, "Record transaction");
    await second.getByLabel(/Amount \(EUR\)/).fill("20");
    await second.getByLabel("Counterparty").fill("di");
    await second.getByRole("option", { name: "Dirk", exact: true }).click();
    await save(second, "Record transaction");

    expect(
      await prisma.counterparty.count({ where: { userId: user.id } }),
    ).toBe(1);
    expect(
      await prisma.financialTransaction.count({
        where: { userId: user.id, counterpartyId: { not: null } },
      }),
    ).toBe(2);

    await page.goto("/settings/finance");
    await page
      .locator("#counterparties")
      .getByRole("link", { name: "Manage counterparties" })
      .click();
    await expect(page).toHaveURL(/\/settings\/finance\/counterparties$/);
    await page.getByRole("button", { name: "Rename counterparty" }).click();
    const renameCounterparty = form(page, "Rename counterparty");
    await renameCounterparty
      .getByLabel("Name", { exact: true })
      .fill("Albert Heijn");
    await save(renameCounterparty, "Rename counterparty", false);
    await page.getByRole("button", { name: "Archive counterparty" }).click();
    await expect(
      page.getByRole("heading", { name: "Archived counterparties" }),
    ).toBeVisible();

    await page.goto("/finance/transactions");
    await expect(page.getByRole("link", { name: /Albert Heijn/ })).toHaveCount(
      2,
    );
    await page.getByText("Add transaction", { exact: true }).click();
    const third = form(page, "Record transaction");
    await third.getByLabel("Counterparty").fill("Albert Heijn");
    await expect(
      third.getByRole("option", { name: "Albert Heijn", exact: true }),
    ).toHaveCount(0);
    await expect(
      third.getByRole("option", {
        name: "Create “Albert Heijn”",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("ledger pagination, validation preservation and dirty navigation", async ({
    page,
  }) => {
    await addAccount(page, "Bank", "1000", true);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const account = await prisma.financialAccount.findFirstOrThrow({
      where: { userId: user.id },
    });
    const ledgerCounterparties = Array.from({ length: 31 }, (_, index) => ({
      id: `ledger-counterparty-${randomUUID()}`,
      userId: user.id,
      name: `Ledger row ${index}`,
      normalizedName: `ledger row ${index}`,
    }));
    await prisma.counterparty.createMany({ data: ledgerCounterparties });
    await prisma.financialTransaction.createMany({
      data: ledgerCounterparties.map((counterparty, index) => ({
        id: `ledger-${randomUUID()}`,
        userId: user.id,
        accountId: account.id,
        counterpartyId: counterparty.id,
        type: "EXPENSE" as const,
        currency: "EUR",
        amountMinor: BigInt(index + 1),
        occurredAt: new Date("2026-02-01T12:00:00Z"),
      })),
    });
    await page.goto("/finance/transactions");
    await expect(page.getByRole("link", { name: /Ledger row/ })).toHaveCount(
      25,
    );
    await page.getByRole("link", { name: "Older transactions" }).click();
    await expect(page.getByRole("link", { name: /Ledger row/ })).toHaveCount(6);
    await page
      .getByRole("link", { name: /Ledger row/ })
      .first()
      .click();
    await page.getByText("Delete as a correction", { exact: true }).click();
    await page
      .getByRole("button", {
        name: "Confirm transaction deletion",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/finance\/transactions$/);
    expect(
      await prisma.financialTransaction.count({ where: { userId: user.id } }),
    ).toBe(30);
    await page.getByText("Add transaction", { exact: true }).click();
    const entry = form(page, "Record transaction");
    await entry.getByLabel(/Amount \(EUR\)/).fill("1.001");
    await entry.getByLabel("Counterparty").fill("Preserve this entry");
    await entry
      .getByRole("button", { name: "Record transaction", exact: true })
      .click();
    await expect(entry.getByRole("alert")).toContainText("decimal places");
    await expect(entry.getByLabel("Counterparty")).toHaveValue(
      "Preserve this entry",
    );
    const backConfirmation = page.waitForEvent("dialog");
    await page.evaluate(() => window.history.back());
    await (await backConfirmation).dismiss();
    await expect(entry.getByLabel("Counterparty")).toHaveValue(
      "Preserve this entry",
    );
    const close = page.getByRole("button", {
      name: "Close Record money movement",
      exact: true,
    });
    page.once("dialog", (dialog) => dialog.dismiss());
    await close.click();
    await expect(entry.getByLabel("Counterparty")).toHaveValue(
      "Preserve this entry",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await close.click();
    await expect(entry).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Finance navigation" })
      .getByRole("link", { name: "Accounts", exact: true })
      .click();
    await expect(page).toHaveURL(/\/finance\/accounts/);
  });

  test("keeps category management behind Finance settings", async ({
    page,
  }) => {
    await addAccount(page, "Bank", "1000", true);
    await page.goto("/finance/transactions");
    await page.getByText("Add transaction", { exact: true }).click();
    const transaction = form(page, "Record transaction");
    await transaction.getByLabel(/Amount \(EUR\)/).fill("10");
    await transaction.getByLabel("Category").fill("Groceries");
    await transaction
      .getByRole("option", { name: "Create “Groceries”", exact: true })
      .click();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await expect
      .poll(() => prisma.expenseCategory.count({ where: { userId: user.id } }))
      .toBe(1);
    await save(transaction, "Record transaction");
    await page.goto("/finance/transactions");

    const userIdentity = page.locator('[data-testid="user-identity"]:visible');
    if (!(await userIdentity.isVisible())) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await userIdentity.click();
    const accountMenu = page.getByRole("menu", { name: "Account" });
    await expect(accountMenu.getByRole("menuitem")).toHaveText([
      "Settings",
      "Sign out",
    ]);
    await accountMenu.getByRole("menuitem", { name: "Settings" }).click();

    await expect(page).toHaveURL(/\/settings\/finance$/);
    const categorySection = page.locator("#categories");
    await expect(
      categorySection.getByRole("button", { name: "Add category" }),
    ).toHaveCount(0);
    await categorySection
      .getByRole("link", { name: "Manage categories" })
      .click();

    await expect(page).toHaveURL(/\/settings\/finance\/categories$/);
    await expect(page.getByText("Groceries", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Rename category" }).click();
    const renameCategory = form(page, "Rename category");
    await renameCategory.getByLabel("Name", { exact: true }).fill("Dining");
    await save(renameCategory, "Rename category", false);
    await expect(page.getByText("Dining", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Archive category" }).click();
    await expect(page.getByText("No active categories")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Archived categories" }),
    ).toBeVisible();

    await page.goto("/finance/transactions");
    await expect(page.getByRole("link", { name: /Dining/ })).toBeVisible();
    await page.getByText("Add transaction", { exact: true }).click();
    const nextTransaction = form(page, "Record transaction");
    await nextTransaction.getByLabel("Category").fill("Dining");
    await expect(
      nextTransaction.getByRole("option", { name: "Dining", exact: true }),
    ).toHaveCount(0);
    await expect(
      nextTransaction.getByRole("option", {
        name: "Create “Dining”",
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/settings/finance/categories");
    await page.getByRole("link", { name: "Finance settings" }).click();
    await expect(
      page.locator("#categories").getByRole("link", {
        name: "Manage categories",
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
function form(page: Page, button: string) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button, exact: true }) });
}
async function save(form: Locator, button: string, expectSaved = true) {
  await form.getByRole("button", { name: button, exact: true }).click();
  await expect
    .poll(
      () =>
        form.evaluateAll((forms, expectSaved) => {
          // A successful save may remove the dialog between separate locator reads.
          // Read visibility, status and submit state in one browser snapshot.
          const form = forms[0];
          if (!form || !form.getClientRects().length) return "complete";
          if (expectSaved)
            return form.querySelector('[role="status"]')?.textContent ===
              "Saved."
              ? "complete"
              : "pending";
          const submit = form.querySelector<HTMLButtonElement>(
            'button[type="submit"]',
          );
          return !submit || !submit.disabled ? "complete" : "pending";
        }, expectSaved),
      { timeout: 20_000 },
    )
    .toBe("complete");
}
async function addAccount(
  page: Page,
  name: string,
  balance: string,
  savings: boolean,
) {
  await page.goto("/finance/accounts");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  const entry = form(page, "Create account & reconcile");
  await entry.getByLabel("Account name").fill(name);
  await entry.getByLabel("Current balance").fill(balance);
  await entry.getByLabel("Observed at (Amsterdam)").fill("2026-01-01T12:00");
  if (savings) await entry.getByLabel("Include in liquid savings").check();
  await save(entry, "Create account & reconcile");
}
async function createGoal(page: Page, name: string, target: string) {
  await page
    .getByRole("button", { name: "New savings goal", exact: true })
    .click();
  const entry = form(page, "Create goal");
  await entry.getByLabel("Goal name").fill(name);
  await entry.getByLabel("Original target").fill(target);
  await save(entry, "Create goal");
}
