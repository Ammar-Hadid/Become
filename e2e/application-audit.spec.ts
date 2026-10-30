import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test("a stalled sign-in releases its controls and preserves credentials for retry", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByTestId("email-input").fill("timeout-audit@example.test");
  await page.getByTestId("password-input").fill("disposable-test-password");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/sign-in/email", async (route) => {
    await held;
    await route.abort();
  });
  try {
    await page.getByTestId("auth-submit").click();
    await expect(
      page.locator(".auth-form-wrap").getByRole("alert"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("auth-submit")).toBeEnabled();
    await expect(page.getByTestId("email-input")).toHaveValue(
      "timeout-audit@example.test",
    );
    await expect(page.getByTestId("password-input")).toHaveValue(
      "disposable-test-password",
    );
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

async function register(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Application Audit");
  await page
    .getByTestId("email-input")
    .fill(`audit-${randomUUID()}@example.test`);
  await page.getByTestId("password-input").fill("become-audit-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
}

test("stalled dashboard lenses and credential saves recover without losing input", async ({
  page,
}) => {
  await register(page);
  const lenses = page.getByRole("region", {
    name: "Dashboard lenses",
    exact: true,
  });
  let release!: () => void;
  let gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/dashboard/lenses?*", async (route) => {
    await gate;
    await route.abort();
  });
  try {
    await lenses
      .getByRole("button", { name: "Engineering", exact: true })
      .click();
    await expect(lenses.getByRole("alert")).toContainText(
      "This lens could not load.",
      { timeout: 20_000 },
    );
    release();
    await page.unrouteAll({ behavior: "wait" });
    await lenses
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await expect(lenses).toHaveAttribute("data-lens", "engineering");
    await page.goto("/settings/nexo");
    const key = page.getByLabel("openai API key", { exact: true });
    await key.fill("audit-not-a-real-provider-key");
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/settings/ai-credentials", async (route) => {
      await gate;
      await route.abort();
    });
    const row = page.locator(".nexo-provider-entry").filter({ has: key });
    await row.getByRole("button", { name: "Save key", exact: true }).click();
    await expect(
      row.getByRole("button", { name: "Save key", exact: true }),
    ).toBeEnabled({ timeout: 20_000 });
    await expect(key).toHaveValue("audit-not-a-real-provider-key");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("implemented area routes load without browser exceptions or server failures", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  const protocolErrors: string[] = [];
  page.on("pageerror", (error) => protocolErrors.push(error.message));
  await page.exposeFunction("recordAuditRuntimeError", (message: string) =>
    errors.push(message),
  );
  await page.addInitScript(() => {
    const record = (message: string) => {
      const bridge = window as typeof window & {
        recordAuditRuntimeError: (message: string) => Promise<void>;
      };
      void bridge.recordAuditRuntimeError(message).catch(() => {});
    };
    window.addEventListener("error", (event) => record(event.message));
    window.addEventListener("unhandledrejection", (event) =>
      record(String(event.reason)),
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 500)
      errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await register(page);
  const routes = [
    "/",
    "/sessions",
    "/engineering",
    "/engineering/projects",
    "/engineering/projects/new",
    "/engineering/evidence",
    "/engineering/evidence/new",
    "/finance",
    "/finance/accounts",
    "/finance/transactions",
    "/finance/savings",
    "/finance/recurring",
    "/finance/opportunities",
    "/entrepreneurship",
    "/entrepreneurship/audience",
    "/entrepreneurship/evidence",
    "/entrepreneurship/history",
    "/entrepreneurship/market",
    "/entrepreneurship/interactions",
    "/entrepreneurship/offers",
    "/entrepreneurship/problems",
    "/content",
    "/direction",
    "/direction/goals",
    "/direction/goals/new",
    "/direction/experiments",
    "/direction/experiments/new",
    "/direction/ideas",
    "/direction/decisions",
    "/direction/decisions/new",
    "/direction/seasons",
    "/reviews",
    "/settings/personal",
    "/settings/application",
    "/settings/finance",
    "/settings/finance/categories",
    "/settings/finance/counterparties",
    "/settings/nexo",
  ];
  for (const route of routes) {
    await test.step(route, async () => {
      const response = await page.goto(route);
      expect(response?.status(), route).toBeLessThan(400);
      await expect(page.locator("main")).toBeVisible();
      const recurringCheck = page.getByRole("button", {
        name: "Check due expenses",
        exact: true,
      });
      if (await recurringCheck.count())
        await expect(recurringCheck).toBeEnabled();
      await expect(page.locator("body")).not.toContainText("Application error");
      expect(errors, route).toEqual([]);
    });
  }
  // Recipe authoring is deliberately owner-only, including its read API.
  expect((await page.goto("/settings/image-direction"))?.status()).toBe(404);
  expect(
    (await page.request.get("/api/settings/image-direction")).status(),
  ).toBe(403);
  await testInfo.attach("runtime-errors", {
    body: JSON.stringify({ errors, protocolErrors }, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});
