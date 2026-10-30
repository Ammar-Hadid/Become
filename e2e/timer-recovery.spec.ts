import { openSessionHistory } from "./utils/session-history.util";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test.describe("recovered timer completion", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = `timer-recovery-${randomUUID()}@example.test`;
    await page.goto("/sign-in");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByTestId("name-input").fill("Recovery Tester");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill("become-test-password");
    await page.getByTestId("auth-submit").click();
    await expect(page).toHaveURL(/\/direction\/seasons\/\d{4}\/\d\/opening/, {
      timeout: 15_000,
    });
    await page.goto("/?timer=recovery");
    await page.locator('[data-testid="start-timer-trigger"]:visible').click();
    await page
      .getByRole("dialog", { name: "What are you working on?" })
      .getByRole("button", { name: "Engineering", exact: true })
      .click();
    await page
      .getByTestId("engineering-context-select")
      .selectOption("PERSONAL");
    await page.getByTestId("session-description").fill("Recovered work");
    await page.getByTestId("confirm-start-timer").click();
    await expect(page.getByTestId("dashboard-active-session")).toBeVisible();
  });

  test.afterEach(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  test("stops a reopened timer before refresh and keeps navigation usable", async ({
    page,
    context,
  }) => {
    const sessionId = (await page
      .getByTestId("dashboard-active-session")
      .getAttribute("data-session-id"))!;
    await page.close();
    // Represent time away without making the browser journey wait two hours.
    await prisma.session.update({
      where: { id: sessionId },
      data: { startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });
    const reopened = await context.newPage();
    await reopened.goto("/");
    const timer = reopened.getByTestId("dashboard-active-session");
    await expect(timer).toHaveAttribute("data-session-id", sessionId);
    expect(
      Number(await timer.getAttribute("data-elapsed-seconds")),
    ).toBeGreaterThanOrEqual(7200);

    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    await reopened.route("**/*", async (route) => {
      const request = route.request();
      if (
        request.headers().rsc === "1" &&
        new URL(request.url()).pathname === "/"
      ) {
        await refreshGate;
      }
      await route.continue();
    });

    try {
      await timer.getByTestId("end-session").click();
      await reopened
        .getByTestId("session-outcome")
        .fill("Recovered session saved");
      const responsePromise = reopened.waitForResponse(
        `/api/sessions/${sessionId}/complete`,
      );
      await reopened.getByTestId("confirm-stop-timer").click();
      expect((await responsePromise).ok()).toBe(true);
      const saved = await prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(saved.endedAt).not.toBeNull();
      await expect(timer).toHaveCount(0);
      await expect(
        reopened.getByRole("button", {
          name: "End focus session",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(reopened.getByRole("dialog")).toHaveCount(0);
      await expect(reopened.locator("body")).not.toHaveCSS(
        "overflow",
        "hidden",
      );
      await expect(reopened.getByText("Running", { exact: true })).toHaveCount(
        0,
      );
      const navigationRequest = reopened.waitForRequest(
        (request) =>
          new URL(request.url()).pathname === "/sessions" &&
          request.headers().rsc === "1",
      );
      await Promise.all([
        openSessionHistory(reopened),
        navigationRequest.then(() => releaseRefresh()),
      ]);
      await expect(reopened).toHaveURL(/\/sessions$/);
      await expect(
        reopened
          .getByTestId("session-row-trigger")
          .filter({ hasText: "Recovered work" }),
      ).toContainText("Recovered session saved");
    } finally {
      releaseRefresh();
      await reopened.unrouteAll({ behavior: "wait" });
    }
    await reopened.reload();
    await expect(
      reopened.getByRole("button", { name: "End focus session", exact: true }),
    ).toHaveCount(0);
    await reopened
      .locator('[data-testid="start-timer-trigger"]:visible')
      .click();
    await expect(reopened.getByTestId("confirm-start-timer")).toBeVisible();
    await reopened.close();
  });

  test("recovers a lost completion response without changing the session or duplicating evidence", async ({
    page,
  }) => {
    await page.reload();
    const timer = page.getByTestId("dashboard-active-session");
    const sessionId = (await timer.getAttribute("data-session-id"))!;
    const completionUrl = `/api/sessions/${sessionId}/complete`;
    await timer.getByTestId("end-session").click();
    await page.getByTestId("session-outcome").fill("Original outcome");
    await page
      .getByRole("button", { name: "Record concrete evidence" })
      .click();
    await page
      .getByTestId("engineering-evidence-title")
      .fill("Recovery verified");
    await page.route(
      `**${completionUrl}`,
      async (route) => {
        // The server commits, but the browser never receives its acknowledgement.
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page.getByTestId("confirm-stop-timer").click();
    await expect(
      page.getByText("Could not confirm the save.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByTestId("confirm-stop-timer")).toBeEnabled();
    const original = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(original.endedAt).not.toBeNull();
    await page
      .getByTestId("session-outcome")
      .fill("Retry must not overwrite this");
    await page.getByTestId("confirm-stop-timer").click();
    await expect(timer).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const saved = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(saved.endedAt).toEqual(original.endedAt);
    expect(saved.outcome).toBe("Original outcome");
    expect(
      await prisma.engineeringEvidence.count({ where: { sessionId } }),
    ).toBe(1);
    await page.locator('[data-testid="start-timer-trigger"]:visible').click();
    await page
      .getByTestId("engineering-context-select")
      .selectOption("PERSONAL");
    await page.getByTestId("confirm-start-timer").click();
    await expect(timer).toBeVisible();
    await expect(timer).not.toHaveAttribute("data-session-id", sessionId);
  });

  test("concurrent completions return the same saved session and create evidence once", async ({
    page,
  }) => {
    const sessionId = (await page
      .getByTestId("dashboard-active-session")
      .getAttribute("data-session-id"))!;
    const complete = (outcome: string) =>
      page.request.post(`/api/sessions/${sessionId}/complete`, {
        headers: { origin: new URL(page.url()).origin },
        data: {
          outcome,
          engineeringContext: "PERSONAL",
          engineeringEvidence: { type: "BUG_SOLVED", title: "One record" },
        },
      });
    const responses = await Promise.all([
      complete("First request"),
      complete("Second request"),
    ]);
    for (const response of responses)
      expect(response.ok(), await response.text()).toBe(true);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(bodies[0].session).toEqual(bodies[1].session);
    expect(
      await prisma.engineeringEvidence.count({ where: { sessionId } }),
    ).toBe(1);
  });
});
