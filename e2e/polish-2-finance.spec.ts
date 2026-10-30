import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { Locator } from "@playwright/test";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "../src/features/domains/defaults/services/ensure-default-domains.service";

test("Long account content stays inside the shared header", async ({
  page,
  context,
  baseURL,
}, info) => {
  test.setTimeout(30_000);
  page.setDefaultTimeout(10_000);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  )
    throw new Error("Local database required for disposable UI fixtures.");
  const email = `polish-2-header-${randomUUID()}@example.test`;
  const signup = await context.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: {
      name: "Finance details review for independent work and household planning throughout this Season",
      email,
      password: "disposable-finance-details-password",
    },
  });
  expect(signup.ok()).toBe(true);
  const { user } = await signup.json();
  try {
    const now = DateTime.now().setZone("Europe/Amsterdam");
    await context.request.post("/api/direction/cots", {
      headers: { origin: baseURL! },
      data: { action: "DEFER_OPENING", year: now.year, quarter: now.quarter },
    });
    await page.goto("/settings/application", { waitUntil: "networkidle" });
    const measurements = [];
    for (const width of [768, 1025, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await page.evaluate(() => {
        const box = (selector: string) => {
          const element = document.querySelector(selector)!;
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        };
        return {
          width: innerWidth,
          account: box(".app-header-account"),
          name: box(".app-header-account-name"),
          text: box(".app-header-account-name > span"),
          chevron: box(".app-header-account-name > svg"),
          copy: box(".app-header-account-copy"),
          actions: box(".app-header-actions"),
          leading: box(".app-header-leading"),
          trailing: box(".app-header-trailing"),
        };
      });
      measurements.push(geometry);
      console.log("HEADER_GEOMETRY", JSON.stringify(geometry));
      expect
        .soft(geometry.chevron.right)
        .toBeLessThanOrEqual(geometry.account.right + 1);
      expect
        .soft(geometry.text.right)
        .toBeLessThanOrEqual(geometry.account.right + 1);
      expect
        .soft(geometry.actions.left)
        .toBeGreaterThanOrEqual(geometry.account.right);
      expect
        .soft(geometry.trailing.left)
        .toBeGreaterThanOrEqual(geometry.leading.right);
      await page.screenshot({
        path: info.outputPath(`header-${width}.png`),
        animations: "disabled",
      });
    }
    await info.attach("header-geometry", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
  } finally {
    await page.goto("about:blank").catch(() => {});
    await deleteDisposableBrowserUser(user.id, email);
  }
});

test("Finance and Settings secondary flows retain usable controls", async ({
  page,
  context,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  )
    throw new Error("Local database required for disposable UI fixtures.");
  const email = `polish-2-finance-${randomUUID()}@example.test`;
  const signup = await context.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: {
      name: "Finance details review",
      email,
      password: "disposable-finance-details-password",
    },
  });
  expect(signup.ok(), await signup.text()).toBe(true);
  const { user } = await signup.json();
  const now = DateTime.now().setZone("Europe/Amsterdam");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await context.request.post("/api/direction/cots", {
      headers: { origin: baseURL! },
      data: { action: "DEFER_OPENING", year: now.year, quarter: now.quarter },
    });
    await ensureDefaultDomains(user.id);
    const account = await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: "Everyday account for household costs and independent work",
        type: "CHECKING",
        currency: "EUR",
        includeInLiquidSavings: true,
      },
    });
    await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: "Savings for a place of my own",
        type: "SAVINGS",
        currency: "EUR",
      },
    });
    await prisma.financialAccountBalanceSnapshot.create({
      data: {
        userId: user.id,
        accountId: account.id,
        balanceMinor: 1450000n,
        reconciledAt: now.minus({ days: 20 }).toJSDate(),
      },
    });
    const category = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        name: "Home office equipment and software subscriptions",
        normalizedName: "home office equipment and software subscriptions",
      },
    });
    const counterparty = await prisma.counterparty.create({
      data: {
        userId: user.id,
        name: "Market Street creative studio and learning resources",
        normalizedName: "market street creative studio and learning resources",
      },
    });
    const income = await prisma.financialTransaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        type: "INCOME",
        inflowKind: "EARNED_WORK",
        currency: "EUR",
        amountMinor: 1234567n,
        occurredAt: now.minus({ days: 1 }).toJSDate(),
      },
    });
    await prisma.financialTransaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        type: "EXPENSE",
        currency: "EUR",
        amountMinor: 6900n,
        expenseCategoryId: category.id,
        counterpartyId: counterparty.id,
        occurredAt: now.minus({ days: 1 }).toJSDate(),
      },
    });
    await prisma.recurringExpense.create({
      data: {
        userId: user.id,
        name: "Home internet, mobile connection, and the shared workspace subscription",
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
    const domain = await prisma.domain.findUniqueOrThrow({
      where: { userId_slug: { userId: user.id, slug: "finance" } },
      include: { activityTypes: true },
    });
    const source = await prisma.workSource.create({
      data: {
        userId: user.id,
        name: "Independent accessibility and interface design consulting",
        type: "CLIENT",
        defaultCompensationType: "FIXED",
      },
    });
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        domainId: domain.id,
        activityTypeId: domain.activityTypes.find(
          (activity) => activity.financeActivityKind === "PAID_WORK",
        )!.id,
        financeActivityKind: "PAID_WORK",
        workSourceId: source.id,
        startedAt: now.minus({ days: 2, hours: 2 }).toJSDate(),
        endedAt: now.minus({ days: 2 }).toJSDate(),
        description:
          "Review the keyboard controls and responsive layouts across the complete customer workspace",
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
              name: "Character research and detailed Season preparation",
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
    const capture = async (name: string, scope?: Locator) => {
      const options = {
        path: info.outputPath(`${name}.png`),
        animations: "disabled" as const,
      };
      if (scope) await scope.screenshot(options);
      else {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ ...options, fullPage: true });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect.soft(overflow, `${name} stays within the viewport`).toBe(false);
    };
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/finance/recurring", { waitUntil: "networkidle" });
      const trigger = page.getByRole("button", {
        name: /Actions for Home internet/,
      });
      await trigger.click();
      const menu = page.getByRole("menu", {
        name: /Actions for Home internet/,
      });
      await expect(menu).toBeVisible();
      await capture(`recurring-menu-${width}`);
      await menu
        .getByRole("menuitem", { name: "Edit schedule and terms" })
        .click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await capture(`recurring-edit-${width}`, page.locator("dialog[open]"));
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await page.goto(`/finance/transactions/${income.id}`, {
        waitUntil: "networkidle",
      });
      await page
        .locator('.finance-payment-candidates input[type="checkbox"]')
        .check();
      await page
        .getByRole("button", { name: "Divide by time spent", exact: true })
        .click();
      await expect(
        page.getByText("Fully connected", { exact: true }),
      ).toBeVisible();
      await capture(`payment-attribution-${width}`);
      await page.goto(`/finance/work/${session.id}`, {
        waitUntil: "networkidle",
      });
      await capture(`paid-work-${width}`);
      await page.goto("/settings/nexo", { waitUntil: "networkidle" });
      await page.locator(".nexo-profile-editor > summary").click();
      await page.getByText("Advanced model controls", { exact: true }).click();
      await capture(
        `nexo-controls-${width}`,
        page.locator(".nexo-profile-editor"),
      );
      await page
        .getByLabel("Input price (USD / million tokens)", { exact: true })
        .fill("-1");
      await page.locator(".nexo-profile-advanced > summary").click();
      await page.locator(".nexo-profile-editor > summary").click();
      await page
        .getByRole("button", { name: "Save Nexo settings", exact: true })
        .click();
      const revealed = await page
        .locator(".nexo-profile-advanced")
        .evaluate((el) => (el as HTMLDetailsElement).open);
      await capture(`nexo-invalid-price-${width}`);
      expect
        .soft(revealed, `invalid hidden pricing is revealed at ${width}px`)
        .toBe(true);
      await expect
        .soft(
          page.getByLabel("Input price (USD / million tokens)", {
            exact: true,
          }),
        )
        .toBeFocused();
      if (revealed) {
        await page
          .getByLabel("Input price (USD / million tokens)", { exact: true })
          .clear();
        await page
          .getByLabel("Output price (USD / million tokens)", { exact: false })
          .fill("1001");
        await page.locator(".nexo-profile-advanced > summary").click();
        await page.locator(".nexo-profile-editor > summary").click();
        await page
          .getByRole("button", { name: "Save Nexo settings", exact: true })
          .click();
        await expect
          .soft(
            page.getByLabel("Output price (USD / million tokens)", {
              exact: false,
            }),
          )
          .toBeFocused();
        await expect
          .soft(
            page.getByLabel("Output price (USD / million tokens)", {
              exact: false,
            }),
          )
          .toBeVisible();
        await capture(`nexo-invalid-output-price-${width}`);
      }
      await page.goto("/settings/nexo", { waitUntil: "networkidle" });
      const search = page
        .getByRole("searchbox", { name: "Search active AI tasks" })
        .filter({ visible: true });
      await search.fill("does not match any task");
      await expect(
        page.getByText("No task selected", { exact: true }),
      ).toBeVisible();
      await capture(`nexo-no-matches-${width}`);
      await search.clear();
      await page.getByText("Connection details", { exact: true }).click();
      await capture(
        `nexo-route-${width}`,
        page.locator(".nexo-route-inspector"),
      );
    }
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.goto("/finance/transactions", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .click();
    const dialog = page.locator("dialog[open]");
    await dialog
      .getByLabel("Transaction type", { exact: true })
      .selectOption("TRANSFER");
    await dialog.getByLabel("Amount (EUR)", { exact: true }).fill("999999");
    await expect(dialog.getByRole("alert")).toContainText("exceeds");
    await capture("transfer-validation-768", dialog);
    await page.goto("/finance/transactions", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .click();
    await dialog
      .getByLabel("Transaction type", { exact: true })
      .selectOption("EXPENSE");
    await dialog.getByRole("combobox", { name: /Category/ }).fill("Home");
    await capture("expense-category-suggestions-768", dialog);
    await page.goto("/settings/personal", { waitUntil: "networkidle" });
    await page.getByLabel("Email", { exact: true }).fill(`changed-${email}`);
    await page
      .getByLabel("Current password", { exact: true })
      .fill("wrong-disposable-password");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.locator(".personal-settings-feedback [role=alert]"),
    ).toHaveText("Your current password is incorrect.");
    await expect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).toBeEnabled();
    await capture("personal-email-validation-768");
    await page
      .getByRole("button", { name: "Reset changes", exact: true })
      .click();
    await expect(
      page.getByLabel("Current password", { exact: true }),
    ).toHaveCount(0);
    await page.goto("/settings/application", { waitUntil: "networkidle" });
    await capture("application-settings-768");
    expect(errors).toEqual([]);
  } finally {
    await page.goto("about:blank").catch(() => {});
    await deleteDisposableBrowserUser(user.id, email);
  }
});
