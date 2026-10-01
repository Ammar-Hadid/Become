import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import {
  expect,
  test,
  type Locator,
  type Page,
} from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test.describe("Finance open banking", () => {
  test("maps external current evidence to Savings and validates card repayment", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const { userId } = await signUp(page, "Mapping Tester");
    const bankUpdatedAt = DateTime.now()
      .setZone("Europe/Amsterdam")
      .startOf("minute");
    await createAccount(page, {
      name: "Travel reserve",
      type: "SAVINGS",
      balance: "2400",
      savings: true,
    });
    const savings = await prisma.financialAccount.findFirstOrThrow({
      where: { userId, name: "Travel reserve" },
    });
    await prisma.financialAccountBalanceSnapshot.updateMany({
      where: { userId, accountId: savings.id },
      data: { reconciledAt: bankUpdatedAt.minus({ days: 45 }).toJSDate() },
    });
    const importedAt = bankUpdatedAt.minus({ days: 7 });
    await prisma.financialTransaction.create({
      data: {
        userId,
        accountId: savings.id,
        type: "EXPENSE",
        amountMinor: 15000n,
        currency: "EUR",
        occurredAt: importedAt.toJSDate(),
        activityOn: importedAt.toISODate(),
        dataSource: "STATEMENT_IMPORT",
      },
    });
    const connection = await prisma.bankConnection.create({
      data: {
        userId,
        provider: "ENABLE_BANKING",
        institutionName: "Revolut",
        institutionCountry: "LT",
        status: "CONNECTED",
        sessionId: "e2e-session",
        consentExpiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
        lastSuccessAt: bankUpdatedAt.toJSDate(),
      },
    });
    const external = await prisma.externalBankAccount.create({
      data: {
        userId,
        connectionId: connection.id,
        provider: connection.provider,
        identityKey: `revolut-${randomUUID()}`,
        authorizedSessionId: connection.sessionId,
        providerAccountId: "revolut-eur-e2e",
        externalType: "CURRENT",
        currency: "EUR",
        maskedIdentifier: "•• 4821",
      },
    });
    await prisma.financialBalanceObservation.create({
      data: {
        userId,
        externalAccountId: external.id,
        source: "LIVE_SYNC",
        balanceMinor: 275000n,
        currency: "EUR",
        balanceType: "ITAV",
        includesPending: true,
        observedAt: bankUpdatedAt.toJSDate(),
        payloadHash: `e2e-itav-${randomUUID()}`,
        raw: { balance_type: "ITAV" },
      },
    });

    await gotoStable(page, "/finance/connections");
    await page.getByText("Map account", { exact: true }).click();
    await page
      .getByRole("radio", { name: /^Create a new Become account/ })
      .check();
    const inlineCreate = form(page, "Create and map account");
    await expect(inlineCreate.getByLabel("Bank / institution")).toHaveValue(
      "Revolut",
    );
    await expect(inlineCreate.getByLabel("Current balance")).toHaveCount(0);
    await expect(inlineCreate).toContainText(
      "Balance comes from your bank when available.",
    );
    await page
      .getByRole("radio", { name: /^Use one of my Become accounts/ })
      .check();
    const mapping = form(page, "Confirm mapping");
    await mapping
      .getByLabel("Become account")
      .selectOption({ label: "Travel reserve · Savings" });
    await page.screenshot({
      path: testInfo.outputPath("external-current-to-savings-mapping.png"),
      fullPage: true,
    });
    await save(mapping, "Confirm mapping");

    await expect
      .poll(async () =>
        prisma.externalBankAccount.findUniqueOrThrow({
          where: { id: external.id },
          select: { financialAccountId: true },
        }),
      )
      .toEqual({ financialAccountId: savings.id });
    await expect
      .poll(async () =>
        prisma.financialAccount.findUniqueOrThrow({
          where: { id: savings.id },
          select: {
            name: true,
            type: true,
            dataSource: true,
            includeInLiquidSavings: true,
          },
        }),
      )
      .toEqual({
        name: "Travel reserve",
        type: "SAVINGS",
        dataSource: "LIVE_SYNC",
        includeInLiquidSavings: true,
      });

    await gotoStable(page, "/finance/accounts");
    const savingsRow = page
      .locator(".finance-account-row")
      .filter({ hasText: "Travel reserve" });
    await expect(savingsRow).toContainText(
      "Savings · Included in liquid savings",
    );
    await expect(
      savingsRow.getByText("EUR 2,750.00", { exact: true }),
    ).toHaveCount(1);
    await expect(savingsRow).toContainText(
      "Available · includes pending · Bank updated today",
    );
    await savingsRow.click();
    const savingsHero = page.locator(".finance-account-hero");
    await expect(
      page.getByRole("heading", { name: "Travel reserve", exact: true }),
    ).toBeVisible();
    await expect(savingsHero).toContainText("Available bank balance");
    await expect(
      savingsHero.getByText("EUR 2,750.00", { exact: true }),
    ).toHaveCount(1);
    await expect(savingsHero).toContainText(
      "Based on the latest available balance from your bank and movement recorded after it. The bank balance includes pending movements.",
    );
    await expect(savingsHero).toContainText("Bank updated");
    await expect(savingsHero).toContainText(
      bankUpdatedAt.toFormat("d LLL yyyy, HH:mm"),
    );
    await expect(savingsHero).toContainText("Sync freshness");
    await expect(savingsHero).toContainText("Synced today");
    await expect(savingsHero).toContainText("Contributes to liquid savings");
    await expect(savingsHero).toContainText("Ingestion source");
    await expect(savingsHero).toContainText("live sync");

    await createAccount(page, {
      name: "Settlement account",
      type: "CHECKING",
      balance: "1000",
    });
    const mappedSavingsArtwork = page
      .locator(".finance-account-row")
      .filter({ hasText: "Travel reserve" })
      .locator(".finance-account-artwork");
    await expect(mappedSavingsArtwork).toContainText("Revolut");
    await expect(mappedSavingsArtwork).toContainText("Travel reserve");
    await gotoStable(page, "/finance/accounts");
    await page.getByRole("button", { name: "Add account" }).click();
    const automatic = form(page, "Create account & reconcile");
    await automatic.getByLabel("Account name").fill("ING Credit Card More");
    await automatic.getByLabel("Account type").selectOption("CREDIT_CARD");
    await automatic.getByLabel("Bank / card issuer").fill("ING");
    await automatic.getByLabel("Automatically from one of my accounts").check();
    await expect(
      automatic.getByLabel("Initial transaction source"),
    ).toHaveValue("STATEMENT_IMPORT");
    await automatic.getByLabel("Current card balance").fill("200");
    await expect(
      automatic.getByLabel("Settlement account", { exact: true }),
    ).toHaveAttribute("required", "");
    await automatic
      .getByRole("button", { name: "Create account & reconcile" })
      .click();
    await expect(automatic).toBeVisible();
    expect(
      await prisma.financialAccount.count({
        where: { userId, name: "ING Credit Card More" },
      }),
    ).toBe(0);
    await automatic
      .getByLabel("Settlement account", { exact: true })
      .selectOption({ label: "Settlement account · EUR" });
    await save(automatic, "Create account & reconcile");

    await page.getByRole("button", { name: "Add account" }).click();
    const manual = form(page, "Create account & reconcile");
    await manual.getByLabel("Account name").fill("Manual card");
    await manual.getByLabel("Account type").selectOption("CREDIT_CARD");
    await manual.getByLabel("Bank / card issuer").fill("Test Bank");
    await manual.getByLabel("Manual / another method").check();
    await expect(
      manual.getByLabel("Settlement account", { exact: true }),
    ).toHaveCount(0);
    await manual.getByLabel("Current card balance").fill("0");
    await save(manual, "Create account & reconcile");

    const cards = await prisma.financialAccount.findMany({
      where: { userId, type: "CREDIT_CARD" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        bankName: true,
        name: true,
        dataSource: true,
        repaymentMethod: true,
        settlementAccountId: true,
      },
    });
    expect(cards).toEqual([
      {
        id: expect.any(String),
        name: "ING Credit Card More",
        bankName: "ING",
        dataSource: "STATEMENT_IMPORT",
        repaymentMethod: "LINKED_ACCOUNT",
        settlementAccountId: expect.any(String),
      },
      {
        id: expect.any(String),
        name: "Manual card",
        bankName: "Test Bank",
        dataSource: "STATEMENT_IMPORT",
        repaymentMethod: "MANUAL",
        settlementAccountId: null,
      },
    ]);
    await expect(
      page.locator(".finance-account-artwork").first(),
    ).toBeVisible();
    const compactCard = page
      .locator(".finance-account-row")
      .filter({ hasText: "ING Credit Card More" })
      .locator(".finance-account-artwork");
    await expect(compactCard).toContainText("ING");
    await expect(compactCard).toContainText("ING Credit Card More");
    await page.screenshot({
      path: testInfo.outputPath("accounts-card-identities.png"),
      fullPage: true,
    });

    await gotoStable(page, `/finance/accounts/${cards[0].id}`);
    const fullCard = page.locator(
      ".finance-account-hero .finance-account-artwork",
    );
    await expect(fullCard).toContainText("ING");
    await expect(fullCard).toContainText("ING Credit Card More");
    const cardSettingsTrigger = page.getByRole("button", {
      name: "Card settings",
    });
    await cardSettingsTrigger.focus();
    await page.keyboard.press("Enter");
    const cardSettings = form(page, "Save card settings");
    await expect(cardSettings).toBeVisible();
    await cardSettings.getByLabel("Credit limit (EUR)").fill("2000");
    await cardSettings.getByLabel("Latest statement balance (EUR)").fill("200");
    await cardSettings.getByLabel("Amount due (EUR)").fill("200");
    await cardSettings.getByLabel("Statement due date").fill("2026-10-15");
    await cardSettings.getByLabel("Usual settlement day").fill("15");
    await page.screenshot({
      path: testInfo.outputPath("credit-card-configuration.png"),
      fullPage: true,
    });
    await save(cardSettings, "Save card settings");
    await expect
      .poll(() =>
        prisma.financialAccount.findUniqueOrThrow({
          where: { id: cards[0].id, userId },
          select: {
            creditLimitMinor: true,
            statementBalanceMinor: true,
            statementDueMinor: true,
            statementDueOn: true,
            settlementDay: true,
          },
        }),
      )
      .toEqual({
        creditLimitMinor: 200000n,
        statementBalanceMinor: 20000n,
        statementDueMinor: 20000n,
        statementDueOn: "2026-10-15",
        settlementDay: 15,
      });
    await fullCard.screenshot({
      path: testInfo.outputPath("named-credit-card-face.png"),
    });
    await page.screenshot({
      path: testInfo.outputPath("credit-card-detail.png"),
      fullPage: true,
    });

    await gotoStable(page, "/finance/connections");
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.locator(".open-banking-control-feedback")).toContainText(
      "Saved.",
    );
    await expect
      .poll(() =>
        prisma.bankSyncJob.count({
          where: { userId, connectionId: connection.id, status: "QUEUED" },
        }),
      )
      .toBe(1);
    await prisma.bankConnection.update({
      where: { id: connection.id, userId },
      data: { status: "REAUTH_REQUIRED" },
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Reconnect" })).toBeVisible();
    const actions = page.getByRole("button", {
      name: "Revolut connection actions",
    });
    await actions.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: "Disconnect" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: testInfo.outputPath("connection-reconnect-state.png"),
      fullPage: true,
    });
  });

  test("keeps Today separate, reviews unknown identities, imports statements and explains forecasts", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    const { userId } = await signUp(page, "Review Tester");
    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: "Daily account",
        type: "CHECKING",
        currency: "EUR",
        dataSource: "STATEMENT_IMPORT",
        snapshots: {
          create: {
            balanceMinor: 500000n,
            reconciledAt: new Date(),
          },
        },
      },
    });
    const counterparty = await prisma.counterparty.create({
      data: {
        userId,
        name: "Known merchant",
        normalizedName: "known merchant",
      },
    });
    const today = DateTime.now().setZone("Europe/Amsterdam").startOf("day");
    const todayOn = today.toISODate()!;
    const olderOn = today.minus({ days: 2 }).toISODate()!;
    let unknownTransactionId = "";
    for (let index = 0; index < 4; index++) {
      const transaction = await prisma.financialTransaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "EXPENSE",
          amountMinor: BigInt(1000 + index),
          currency: "EUR",
          occurredAt: today
            .plus({ hours: 9 + index })
            .toUTC()
            .toJSDate(),
          activityOn: todayOn,
          dataSource: "STATEMENT_IMPORT",
          reviewedAt: null,
          counterpartyId: index < 3 ? counterparty.id : null,
        },
      });
      if (index === 3) unknownTransactionId = transaction.id;
    }
    for (let index = 0; index < 3; index++) {
      await prisma.financialTransaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "EXPENSE",
          amountMinor: BigInt(2000 + index),
          currency: "EUR",
          occurredAt: today
            .minus({ days: 2 })
            .plus({ hours: 9 + index })
            .toUTC()
            .toJSDate(),
          activityOn: olderOn,
          dataSource: "STATEMENT_IMPORT",
          reviewedAt: null,
        },
      });
    }
    await prisma.financialTransaction.createMany({
      data: Array.from({ length: 20 }, (_, index) => ({
        userId,
        accountId: account.id,
        type: "EXPENSE" as const,
        amountMinor: BigInt(3000 + index),
        currency: "EUR",
        occurredAt: today
          .minus({ days: 10 + index })
          .plus({ hours: 9 })
          .toUTC()
          .toJSDate(),
        activityOn: today.minus({ days: 10 + index }).toISODate()!,
        dataSource: "MANUAL" as const,
        reviewedAt: new Date(),
        counterpartyId: counterparty.id,
      })),
    });

    await gotoStable(page, "/finance/transactions");
    await page.getByRole("link", { name: "Older transactions" }).click();
    await expect(page).toHaveURL(/cursor=/);
    const pageTwoCursor = new URL(page.url()).searchParams.get("cursor");
    expect(pageTwoCursor).toBeTruthy();
    await page.locator(".finance-ledger-row").first().click();
    await expect(page).toHaveURL(/cursor=.*selected=/);
    await expect(page.locator(".finance-ledger-detail-panel")).toBeVisible();
    await page
      .getByRole("link", { name: "Back to transactions", exact: true })
      .click();
    await expect
      .poll(() => {
        const parameters = new URL(page.url()).searchParams;
        return {
          cursor: parameters.get("cursor"),
          selected: parameters.has("selected"),
        };
      })
      .toEqual({ cursor: pageTwoCursor, selected: false });

    await gotoStable(page, "/finance");
    const todayActivity = page.locator(".finance-activity-primary");
    await expect(todayActivity).toContainText("Today's activity");
    await expect(todayActivity).toContainText("4 transactions");
    await expect(todayActivity).toContainText("Recognized");
    await expect(todayActivity).toContainText("3");
    await expect(todayActivity).toContainText(
      "1 transaction has an unknown counterparty",
    );
    const previous = page.locator(".finance-previous-activity");
    await expect(previous).not.toHaveAttribute("open", "");
    await expect(previous).toContainText("3 transactions still need review");
    await expect(page.getByText(/7 transactions/)).toHaveCount(0);

    await todayActivity
      .getByRole("link", { name: /Review/ })
      .first()
      .click();
    await expect(page).toHaveURL(/review=unknown/);
    await page.locator(".finance-ledger-row").first().click();
    const detail = page.locator(".finance-ledger-detail-panel");
    await expect(detail).toContainText("Unknown counterparty");
    const interpretation = form(page, "Save interpretation");
    await interpretation
      .getByLabel("Counterparty")
      .selectOption({ label: "Known merchant" });
    await page.screenshot({
      path: testInfo.outputPath("unknown-counterparty-review.png"),
      fullPage: true,
    });
    await save(interpretation, "Save interpretation");
    const interpreted = await prisma.financialTransaction.findUniqueOrThrow({
      where: { id: unknownTransactionId, userId },
    });
    expect(interpreted.reviewedAt).toBeNull();

    await gotoStable(page, `/finance/statements?account=${account.id}`);
    await page.getByRole("button", { name: "Upload statement" }).click();
    const upload = form(page, "Preview statement");
    await upload.getByLabel("Statement file").setInputFiles({
      name: "ing-more.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Date,Amount,Counterparty,Reference\n2026-09-28,-87.42,Bookshop,card-1\n2026-09-29,-19.95,Cafe,card-2",
      ),
    });
    const before = await prisma.financialTransaction.count({
      where: { userId },
    });
    await save(upload, "Preview statement", false);
    await expect(
      page.getByRole("heading", { name: "Statement preview" }),
    ).toBeVisible();
    await expect(page.getByText("2 rows ready to import")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("statement-import-preview.png"),
      fullPage: true,
    });
    expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
      before,
    );
    await save(form(page, "Confirm import"), "Confirm import");
    await expect(
      page.getByRole("heading", { name: "Import complete" }),
    ).toBeVisible();
    expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
      before + 2,
    );

    await gotoStable(page, "/finance/forecast?horizon=30");
    await expect(
      page.getByRole("heading", { name: "The next move, explained." }),
    ).toBeVisible();
    await expect(
      page.getByText("Unallocated after planned payments"),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".finance-forecast-chart")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("forecast-reduced-motion.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});

async function gotoStable(page: Page, href: string) {
  const expected = new URL(href, "http://localhost");
  let navigationError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(href);
      await expect
        .poll(() => {
          const current = new URL(page.url());
          return `${current.pathname}${current.search}`;
        })
        .toBe(`${expected.pathname}${expected.search}`);
      return;
    } catch (error) {
      navigationError = error;
      await page.waitForTimeout(250);
    }
  }
  throw navigationError;
}

async function signUp(page: Page, name: string) {
  const email = `open-banking-${randomUUID()}@example.test`;
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("open-banking-test-password");
  await page.getByTestId("auth-submit").click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
  let arrivalError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto("/?opening=paused", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\?opening=paused$/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(750);
      await expect(page).toHaveURL(/\?opening=paused$/);
      arrivalError = null;
      break;
    } catch (error) {
      arrivalError = error;
      await page.waitForTimeout(250);
    }
  }
  if (arrivalError) throw arrivalError;
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { email, userId: user.id };
}

function form(page: Page, button: string) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button, exact: true }) });
}

async function save(target: Locator, button: string, expectSaved = true) {
  await target.getByRole("button", { name: button, exact: true }).click();
  await expect
    .poll(
      () =>
        target.evaluateAll((forms, shouldShowStatus) => {
          const current = forms[0];
          if (!current || !current.getClientRects().length) return "complete";
          if (shouldShowStatus)
            return current.querySelector('[role="status"]')?.textContent ===
              "Saved."
              ? "complete"
              : "pending";
          const submit = current.querySelector<HTMLButtonElement>(
            'button[type="submit"]',
          );
          return !submit || !submit.disabled ? "complete" : "pending";
        }, expectSaved),
      { timeout: 20_000 },
    )
    .toBe("complete");
}

async function createAccount(
  page: Page,
  input: {
    name: string;
    type: "CHECKING" | "SAVINGS";
    balance: string;
    savings?: boolean;
  },
) {
  await gotoStable(page, "/finance/accounts");
  await page.getByRole("button", { name: "Add account" }).click();
  const entry = form(page, "Create account & reconcile");
  await entry.getByLabel("Account name").fill(input.name);
  await entry.getByLabel("Account type").selectOption(input.type);
  await entry.getByLabel("Current balance").fill(input.balance);
  if (input.savings)
    await entry.getByLabel("Include in liquid savings").check();
  await save(entry, "Create account & reconcile");
}
