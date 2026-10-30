import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test("Finance and Settings stay usable at desktop and phone widths", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(240_000);
  const recurringOnly = process.env.BECOME_E2E_RECURRING_ONLY === "1";
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  ) {
    throw new Error("Finance browser fixtures require local PostgreSQL.");
  }
  const email = `finance-redesign-${randomUUID()}@example.test`;
  const signup = await context.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: {
      name: "Workspace review",
      email,
      password: "finance-redesign-disposable-password",
    },
  });
  expect(signup.ok()).toBe(true);
  const { user } = await signup.json();
  const now = DateTime.now().setZone("Europe/Amsterdam");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const deferredOpening = await context.request.post("/api/direction/cots", {
      headers: { origin: baseURL! },
      data: { action: "DEFER_OPENING", year: now.year, quarter: now.quarter },
    });
    expect(deferredOpening.ok(), await deferredOpening.text()).toBe(true);
    const account = await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: "Everyday account",
        type: "CHECKING",
        currency: "EUR",
        includeInLiquidSavings: true,
      },
    });
    await prisma.financialAccountBalanceSnapshot.create({
      data: {
        userId: user.id,
        accountId: account.id,
        balanceMinor: 140000n,
        reconciledAt: now.minus({ days: 31 }).toJSDate(),
      },
    });
    const category = await prisma.expenseCategory.create({
      data: { userId: user.id, name: "Groceries", normalizedName: "groceries" },
    });
    const counterparty = await prisma.counterparty.create({
      data: {
        userId: user.id,
        name: "Market Street",
        normalizedName: "market street",
      },
    });
    await prisma.financialTransaction.createMany({
      data: Array.from({ length: 8 }, (_, index) => ({
        userId: user.id,
        accountId: account.id,
        type: index % 3 === 0 ? ("INCOME" as const) : ("EXPENSE" as const),
        currency: "EUR",
        amountMinor: BigInt(index % 3 === 0 ? 34900 : 1290 + index * 432),
        occurredAt: now.minus({ days: index }).toJSDate(),
        ...(index % 3 === 0
          ? { inflowKind: "EARNED_WORK" as const }
          : {
              counterpartyId: counterparty.id,
              expenseCategoryId: category.id,
            }),
      })),
    });
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name: "A place of my own",
        currency: "EUR",
        targetAmountMinor: 300000n,
        allocatedAmountMinor: 93000n,
      },
    });
    await prisma.financeCurrencyPolicy.create({
      data: {
        userId: user.id,
        currency: "EUR",
        protectedReserveMinor: 100000n,
      },
    });

    const transaction = await prisma.financialTransaction.findFirstOrThrow({
      where: { userId: user.id, type: "EXPENSE" },
    });
    const opportunity = await prisma.incomeOpportunity.create({
      data: {
        userId: user.id,
        title: "Website accessibility and responsive interface review",
        organizationName: "Market Street creative studio",
        discoveredAt: now.minus({ days: 8 }).toJSDate(),
        appliedAt: now.minus({ days: 4 }).toJSDate(),
        status: "APPLIED",
        channel: "REFERRAL",
        expectedAmountMinor: 125000n,
        expectedCurrency: "EUR",
        compensationType: "FIXED",
      },
    });
    await prisma.recurringExpense.create({
      data: {
        userId: user.id,
        name: "Home internet and mobile connection",
        amountMinor: 6900n,
        currency: "EUR",
        accountId: account.id,
        expenseCategoryId: category.id,
        counterpartyId: counterparty.id,
        frequency: "MONTHLY",
        dayOfMonth: 12,
        startOn: now.startOf("day").toJSDate(),
        processedThroughOn: now.startOf("day").toJSDate(),
      },
    });
    await prisma.nexoSettings.create({
      data: {
        userId: user.id,
        config: {
          schemaVersion: 1,
          dailyRunLimit: 20,
          profiles: [
            {
              id: "polish-model",
              name: "Character research and Season preparation",
              provider: "google",
              model: "gemini-3.8-flash",
              reasoning: "default",
              verbosity: "default",
              maxOutputTokens: 8192,
              timeoutSeconds: 60,
            },
          ],
          assignments: [],
        },
      },
    });

    const viewports = recurringOnly
      ? [{ width: 320, height: 740 }]
      : [
          { width: 1440, height: 1100 },
          { width: 390, height: 844 },
          { width: 320, height: 740 },
        ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const routes = recurringOnly
        ? ["/finance/recurring"]
        : [
            "/finance",
            "/finance/transactions",
            "/finance/accounts",
            `/finance/accounts/${account.id}`,
            "/finance/savings",
            `/finance/savings/${goal.id}`,
            `/finance/transactions/${transaction.id}`,
            "/finance/recurring",
            "/finance/opportunities",
            `/finance/opportunities/${opportunity.id}`,
            "/settings/personal",
            "/settings/application",
            "/settings/finance",
            "/settings/finance/categories",
            "/settings/finance/counterparties",
            "/settings/nexo",
          ];
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await expect(page.locator("h1")).toBeVisible();
        if (route.startsWith("/finance")) {
          await expect(
            page.getByRole("button", { name: "Check due expenses" }),
          ).toBeEnabled();
        }
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(
            `${viewport.width}-${route.replaceAll("/", "-")}.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
      }
      if (recurringOnly) continue;
      await page.goto("/settings/nexo");
      await page.locator(".nexo-profile-editor > summary").click();
      await page.getByText("Advanced model controls", { exact: true }).click();
      await page.locator(".nexo-profile-editor").screenshot({
        path: testInfo.outputPath(
          `${viewport.width}-nexo-profile-controls.png`,
        ),
        animations: "disabled",
      });
      for (const detail of [
        {
          route: `/finance/accounts/${account.id}`,
          title: "Edit account role and lifecycle",
          name: "account",
        },
        {
          route: `/finance/transactions/${transaction.id}`,
          title: "Edit recorded fact",
          name: "transaction",
        },
        {
          route: `/finance/savings/${goal.id}`,
          title: "Edit goal details",
          name: "goal",
        },
        {
          route: `/finance/opportunities/${opportunity.id}`,
          title: "Edit opportunity",
          name: "opportunity",
        },
      ]) {
        await page.goto(detail.route);
        await page.getByText(detail.title, { exact: true }).click();
        await page
          .locator(".workspace-disclosure[open]")
          .last()
          .screenshot({
            path: testInfo.outputPath(
              `${viewport.width}-${detail.name}-edit.png`,
            ),
            animations: "disabled",
          });
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true);
      }
      for (const form of [
        {
          route: `/finance/accounts/${account.id}`,
          trigger: "Update actual balance",
        },
        { route: "/finance/recurring", trigger: "Create schedule" },
      ]) {
        await page.goto(form.route);
        await page
          .getByRole("button", { name: form.trigger, exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("dialog").screenshot({
          path: testInfo.outputPath(
            `${viewport.width}-${form.trigger.replaceAll(" ", "-")}.png`,
          ),
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
      }
      await page.goto("/finance/transactions");
      await page
        .getByRole("button", { name: "Add transaction", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.width}-transaction-form.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Close What happened with your money?" })
        .click();
      await page.getByLabel("Type", { exact: true }).selectOption("EXPENSE");
      await page.getByRole("button", { name: "Apply filters" }).click();
      await expect(page).toHaveURL(/type=EXPENSE/);
      await expect(page.getByLabel("Type", { exact: true })).toHaveValue(
        "EXPENSE",
      );
      await expect(page.locator(".finance-ledger-table tbody tr")).toHaveCount(
        5,
      );
    }
    expect(errors).toEqual([]);
  } finally {
    await page.goto("about:blank");
    await deleteDisposableBrowserUser(user.id, email);
  }
});
