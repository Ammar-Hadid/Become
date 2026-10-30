import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "./utils/browser-test.util";
import {
  createReviewFixture,
  requireReviewTestDatabase,
} from "../src/features/reviews/testing/services/review-fixture.service";
import { addReviewArtworkFixture } from "../src/features/reviews/testing/services/review-artwork-fixture.service";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { isCurrentBecomeSeason } from "../src/features/seasons/presentation/utils/current-season.util";

test.skip(
  process.env.RUN_REVIEW_INTEGRATION !== "1",
  "Requires a guarded disposable Phase 7 PostgreSQL database.",
);
const period = "/reviews/season/2026-04-01",
  finale = "/direction/seasons/2026/2/finale";
async function visit(page: Page, href: string) {
  // Direct-address checks must not tear down a just-committed route while its
  // WebKit prefetches are still starting; UI handoffs below use real links.
  await page.waitForLoadState("networkidle");
  await page.goto(href, { waitUntil: "networkidle" });
}
async function settleSceneCapture(page: Page) {
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
    await new Promise(requestAnimationFrame);
  });
  const composition = await page
    .getByTestId("finale-changes-composition")
    .boundingBox();
  const navigation = await page
    .getByRole("navigation", { name: "Finale passages" })
    .boundingBox();
  expect(composition!.y).toBeGreaterThanOrEqual(
    navigation!.y + navigation!.height,
  );
}
const created: { id: string; email: string }[] = [];
async function signup(page: Page, rich = false) {
  requireReviewTestDatabase();
  const email = `phase7-browser-${randomUUID()}@example.test`,
    password = `Test!${randomUUID()}`;
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { name: "Disposable review journey", email, password },
  });
  expect(response.ok(), `${response.status()}: ${await response.text()}`).toBe(
    true,
  );
  const { user } = await response.json();
  created.push({ id: user.id, email });
  const fixture = await createReviewFixture(user.id, { splitDomains: rich });
  if (rich) {
    await addReviewArtworkFixture(user.id, fixture.seasonId, fixture.contentId);
    const income = await prisma.financialTransaction.findUniqueOrThrow({
      where: { id: fixture.incomeId },
    });
    const category = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        name: "Disposable operating costs",
        normalizedName: "disposable operating costs",
      },
    });
    await prisma.financialTransaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: income.accountId,
          type: "INCOME",
          inflowKind: "EARNED_WORK",
          amountMinor: 240000n,
          currency: "EUR",
          occurredAt: new Date("2026-06-18T12:00:00Z"),
          notes: "Disposable contract payment",
        },
        {
          userId: user.id,
          accountId: income.accountId,
          type: "EXPENSE",
          expenseCategoryId: category.id,
          amountMinor: 12500n,
          currency: "EUR",
          occurredAt: new Date("2026-06-17T12:00:00Z"),
          notes: "Disposable operating expense",
        },
      ],
    });
  }
  return fixture;
}
test.afterEach(async ({ context }) => {
  await Promise.all(context.pages().map((page) => page.close()));
  for (const user of created.splice(0))
    await deleteDisposableBrowserUser(user.id, user.email);
});

test("saved review unfolds into a sparse preserved finale and the existing opening", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const f = await signup(page, true),
    errors: string[] = [];
  const errorDetails: { name: string; message: string; stack?: string }[] = [];
  const runtimeErrors: { kind: string; message: string; url: string }[] = [];
  const serverErrors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500)
      serverErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.exposeFunction(
    "recordReviewRuntimeError",
    (error: { kind: string; message: string; url: string }) =>
      runtimeErrors.push(error),
  );
  await page.addInitScript(() => {
    const record = (kind: string, message: string) => {
      const bridge = window as typeof window & {
        recordReviewRuntimeError: (error: {
          kind: string;
          message: string;
          url: string;
        }) => Promise<void>;
      };
      void bridge
        .recordReviewRuntimeError({ kind, message, url: location.href })
        .catch(() => {});
    };
    window.addEventListener("error", (event) => record("error", event.message));
    window.addEventListener("unhandledrejection", (event) =>
      record("unhandledrejection", String(event.reason)),
    );
  });
  page.on("pageerror", (e) => {
    errors.push(e.message);
    errorDetails.push({ name: e.name, message: e.message, stack: e.stack });
  });
  const failedRequests: { url: string; error: string | null }[] = [];
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? null,
    }),
  );
  await visit(page, period);
  await expect(
    page.getByRole("heading", { name: "Make room for the work", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("review.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Inspect sources for Recorded focused time" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("8h 30m");
  await expect(dialog).toContainText("3 qualifying source records", {
    timeout: 20000,
  });
  await dialog
    .getByRole("link", { name: "Make the small version work" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/sessions\\?session=${f.sessionIds[0]}`),
    { timeout: 20000 },
  );
  await expect(page.getByRole("dialog")).toContainText("2h 30m", {
    timeout: 20000,
  });
  await page.goBack({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(period));
  const closeSources = page.getByRole("button", {
    name: "Close sources for Recorded focused time",
  });
  if (await closeSources.isVisible()) await closeSources.click();
  await page
    .getByLabel("What deserves to stay with you?")
    .fill("The small complete journey mattered. Keep space to learn from it.");
  await page
    .getByText("Something to carry. Something to leave.", { exact: true })
    .click();
  await page
    .getByLabel("Carry forward", { exact: true })
    .fill("Finish one small promise.");
  await page
    .getByLabel("Leave behind", { exact: true })
    .fill("Expanding scope before feedback.");
  await page
    .getByRole("button", { name: "Finalize review", exact: true })
    .click();
  await expect(page.getByText(/Finalized edition/).first()).toBeVisible();
  expect(
    await prisma.reviewEdition.count({
      where: { userId: f.userId, kind: "FINALIZED" },
    }),
  ).toBe(1);
  await page.waitForURL(/editionId=/, { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: "Revisit the finale", exact: true })
    .click();
  await page.waitForURL(new RegExp(finale), { waitUntil: "networkidle" });
  await expect(
    page.getByText("Read the full review first", { exact: true }),
  ).toBeVisible();
  expect(
    await prisma.seasonTransition.count({ where: { userId: f.userId } }),
  ).toBe(0);
  await expect(page.locator("#finale-passage-0")).toBeVisible();
  await expect(page.locator("#finale-passage-1")).toBeHidden();
  await page.screenshot({
    path: info.outputPath("finale-1.png"),
    fullPage: true,
  });
  await page.screenshot({ path: info.outputPath("finale-1-viewport.png") });
  await expect(
    page.getByRole("button", { name: "Open reading view", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Not now", exact: true }),
  ).toHaveCount(1);
  const sceneNav = page.getByRole("navigation", { name: "Finale passages" });
  await sceneNav
    .getByRole("button", { name: "4. What you take with you", exact: true })
    .click();
  await expect(page.locator("#finale-passage-3")).toBeVisible();
  await expect(page.locator("#finale-passage-0")).toBeHidden();
  await expect(page.locator("#finale-passage-3")).toBeFocused();
  const motionReading = await page
    .locator("#finale-passage-3")
    .evaluate((heading) => {
      const scene = heading.closest("section")!;
      const style = getComputedStyle(scene);
      return {
        name: style.animationName,
        duration: style.animationDuration,
        animations: scene.getAnimations({ subtree: true }).map((animation) => ({
          state: animation.playState,
          duration: animation.effect?.getTiming().duration,
        })),
      };
    });
  expect(motionReading.name).not.toBe("none");
  expect(parseFloat(motionReading.duration)).toBeGreaterThanOrEqual(0.36);
  await writeFile(
    info.outputPath("ceremony-motion.json"),
    JSON.stringify(motionReading, null, 2),
  );
  expect(
    (
      await prisma.seasonTransition.findFirstOrThrow({
        where: { userId: f.userId },
      })
    ).movement,
  ).toBe(3);
  expect(
    await prisma.reviewEdition.count({ where: { userId: f.userId } }),
  ).toBe(1);
  await sceneNav
    .getByRole("button", { name: "1. What you brought", exact: true })
    .click();
  await expect(page.locator("#finale-passage-0")).toBeVisible();
  await expect(page.locator("#finale-passage-3")).toBeHidden();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#finale-passage-1")).toBeVisible();
  await expect(page.locator("#finale-passage-0")).toBeHidden();
  await expect(page.locator("#finale-passage-1")).toBeFocused();
  await expect
    .poll(async () => {
      const header = await page
        .getByTestId("finale-days-composition")
        .locator("header")
        .boundingBox();
      const navigation = await sceneNav.boundingBox();
      return header!.y - (navigation!.y + navigation!.height);
    })
    .toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: info.outputPath("finale-2-entered.png") });
  if (info.project.name === "chromium") {
    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 1452, height: 940 });
    await page.screenshot({
      path: info.outputPath("finale-2-wide.png"),
      fullPage: true,
    });
    await page.setViewportSize(originalViewport);
  }
  const timeLandscape = page.getByTestId("finale-days-time-landscape");
  await timeLandscape
    .getByText("Explore the recorded time", { exact: true })
    .click();
  const timeRows = timeLandscape.locator("tbody tr");
  await expect(timeRows).toHaveText(["Apr2h 30m", "May2h 0m", "Jun4h 0m"]);
  const domainFilters = page.getByRole("group", {
    name: "Filter recorded focus by domain",
  });
  await expect(
    domainFilters.getByRole("button", { name: "ALL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const domainNames = await prisma.domain.findMany({
    where: { userId: f.userId },
    select: { name: true },
  });
  for (const { name } of domainNames)
    await expect(
      domainFilters.getByRole("button", { name, exact: true }),
    ).toBeVisible();
  const originalBars = await timeLandscape.evaluate((figure) =>
    Array.from(
      figure.querySelectorAll<SVGGraphicsElement>(
        ".recharts-bar-rectangle path",
      ),
    ).map((bar) => {
      const box = bar.getBBox();
      return { x: box.x, height: box.height };
    }),
  );
  expect(originalBars).toHaveLength(3);
  const geometryPromise = timeLandscape.evaluate(async (figure) => {
    // Start sampling at the actual filter click, after Playwright has scrolled
    // and waited for the control to settle.
    await new Promise<void>((resolve) => {
      const clicked = (event: MouseEvent) => {
        const target =
          event.target instanceof Element
            ? event.target.closest("button")
            : null;
        if (
          target?.textContent?.trim() !== "Content" ||
          !target.closest('[aria-label="Filter recorded focus by domain"]')
        )
          return;
        document.removeEventListener("click", clicked, true);
        resolve();
      };
      document.addEventListener("click", clicked, true);
    });
    const frames: { x: number; height: number }[][] = [];
    for (let i = 0; i < 48; i++) {
      await new Promise(requestAnimationFrame);
      frames.push(
        Array.from(
          figure.querySelectorAll<SVGGraphicsElement>(
            ".recharts-bar-rectangle path",
          ),
        ).map((bar) => {
          const box = bar.getBBox();
          return { x: box.x, height: box.height };
        }),
      );
    }
    return frames;
  });
  await domainFilters
    .getByRole("button", { name: "Content", exact: true })
    .click();
  const animatedGeometry = await geometryPromise;
  await writeFile(
    info.outputPath("domain-chart-geometry.json"),
    JSON.stringify({ originalBars, frames: animatedGeometry }),
  );
  // May stays at 2h. April/June must shrink vertically in their own month slots.
  for (const frame of animatedGeometry) {
    for (const bar of frame)
      expect(
        originalBars.some((original) => Math.abs(original.x - bar.x) < 1),
      ).toBe(true);
    const may = frame.find((bar) => Math.abs(bar.x - originalBars[1].x) < 1);
    if (may)
      expect(Math.abs(may.height - originalBars[1].height)).toBeLessThan(1);
  }
  for (const index of [0, 2]) {
    expect(
      animatedGeometry.some((frame) =>
        frame.some(
          (bar) =>
            Math.abs(bar.x - originalBars[index].x) < 1 &&
            bar.height > 0 &&
            bar.height < originalBars[index].height - 1,
        ),
      ),
    ).toBe(true);
  }
  await expect(page.getByTestId("finale-days-total")).toContainText("2h 0m");
  await expect(timeRows).toHaveText(["Apr0m", "May2h 0m", "Jun0m"]);
  await expect(
    timeLandscape.getByRole("button", {
      name: "Inspect sources for Recorded focused time",
    }),
  ).toHaveCount(0);
  await domainFilters
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  await expect(timeRows).toHaveText(["Apr2h 30m", "May0m", "Jun4h 0m"]);
  await expect(page.getByTestId("finale-days-total")).toContainText("6h 30m");
  await domainFilters
    .getByRole("button", { name: "Finance", exact: true })
    .click();
  await expect(timeRows).toHaveText(["Apr0m", "May0m", "Jun0m"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await domainFilters
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  await expect(timeLandscape).toHaveAttribute(
    "data-chart-animation-duration",
    "0",
  );
  await expect(timeRows).toHaveText(["Apr2h 30m", "May0m", "Jun4h 0m"]);
  await domainFilters.getByRole("button", { name: "ALL", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(timeRows).toHaveText(["Apr2h 30m", "May2h 0m", "Jun4h 0m"]);

  await expect(timeLandscape).toContainText(
    "Recorded time does not measure attention quality.",
  );
  await timeLandscape
    .getByText("Explore the recorded time", { exact: true })
    .click();
  await timeLandscape
    .getByRole("button", { name: "Inspect sources for Recorded focused time" })
    .click();
  await expect(dialog).toContainText("3 qualifying source records");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const recordedMoments = page.getByRole("group", {
    name: "Choose a recorded moment",
  });
  await recordedMoments.getByRole("button").nth(1).click();
  await expect(recordedMoments.getByRole("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page
      .locator('article[data-recompose="true"]')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).not.toBe("none");
  const railBounds = await sceneNav.boundingBox();
  expect(railBounds).not.toBeNull();
  expect(railBounds!.y).toBeGreaterThanOrEqual(0);
  expect(railBounds!.y + railBounds!.height).toBeLessThan(
    page.viewportSize()!.height,
  );
  await page.screenshot({
    path: info.outputPath("finale-2.png"),
    fullPage: true,
  });
  await page.screenshot({ path: info.outputPath("finale-2-viewport.png") });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#finale-passage-2")).toBeVisible();
  const lenses = page.getByRole("group", {
    name: "Read intentions or recorded results",
  });
  await expect(
    lenses.getByRole("button", { name: "Intentions", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const intentionReading = page.getByTestId("finale-changes-intention-reading");
  await expect(
    intentionReading.getByRole("heading", {
      name: "Finish one useful piece",
      exact: true,
    }),
  ).toBeVisible();
  await intentionReading
    .getByText("Read wording, targets & history", { exact: true })
    .click();
  const intentionDetail = intentionReading.locator("details[open]");
  await expect(intentionDetail).toContainText(
    "Build something small enough to place in someone's hands.",
  );
  await expect(intentionDetail).toContainText(
    "A smaller commitment I can finish.",
  );
  await expect(
    intentionReading.getByRole("link", { name: "Open the goal", exact: true }),
  ).toHaveAttribute("href", /direction/);
  await intentionReading
    .getByText("Read wording, targets & history", { exact: true })
    .click();
  await settleSceneCapture(page);
  await page.screenshot({
    path: info.outputPath("finale-3-intentions.png"),
    fullPage: true,
  });
  await lenses
    .getByRole("button", { name: "Recorded results", exact: true })
    .click();
  const domainChoices = page.getByRole("group", {
    name: "Choose a domain to read",
  });
  await domainChoices
    .getByRole("button", { name: "Finance", exact: true })
    .click();
  const resultChoices = page.getByRole("group", {
    name: "Choose a recorded result",
  });
  const resultReading = page.getByTestId("finale-changes-result-reading");
  for (const [label, value] of [
    ["Earned-work income received", "EUR 2,400.00"],
    ["Business revenue received", "EUR 450.00"],
    ["Expenses recorded", "EUR 125.00"],
  ]) {
    const choice = resultChoices.getByRole("button", {
      name: `Read result: ${label}`,
      exact: true,
    });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(
      resultReading.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await expect(resultReading).toContainText(value);
    await expect(resultReading).toContainText("Comparison window");
    await resultReading
      .getByText("How this is counted & compared", { exact: true })
      .click();
    await expect(resultReading.locator("details[open]")).toContainText(
      "complete calendar periods",
    );
    await resultReading
      .getByText("How this is counted & compared", { exact: true })
      .click();
  }
  await resultChoices
    .getByRole("button", {
      name: "Read result: Earned-work income received",
      exact: true,
    })
    .click();
  await settleSceneCapture(page);
  await page.screenshot({
    path: info.outputPath("finale-3-finance.png"),
    fullPage: true,
  });
  if (info.project.name === "chromium") {
    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 1702, height: 887 });
    await settleSceneCapture(page);
    await page.screenshot({
      path: info.outputPath("finale-3-finance-wide.png"),
      fullPage: true,
    });
    await page.setViewportSize(originalViewport);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await domainChoices
    .getByRole("button", { name: "Engineering", exact: true })
    .click();
  const sourceTrigger = page.getByRole("button", {
    name: "Inspect sources for Builds and discoveries recorded",
    exact: true,
  });
  await sourceTrigger.click();
  await expect(dialog).toContainText("1 qualifying source record");
  const sourceBounds = await dialog.boundingBox();
  expect(sourceBounds).not.toBeNull();
  expect(sourceBounds!.y).toBeGreaterThanOrEqual(0);
  expect(sourceBounds!.y + sourceBounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height + 1,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(sourceTrigger).toBeFocused();
  await page.screenshot({
    path: info.outputPath("finale-3.png"),
    fullPage: true,
  });
  await page.screenshot({ path: info.outputPath("finale-3-viewport.png") });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#finale-passage-3")).toBeVisible();
  await expect(
    page
      .getByText(
        "The small complete journey mattered. Keep space to learn from it.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("finale-4.png"),
    fullPage: true,
  });
  await page.screenshot({ path: info.outputPath("finale-4-viewport.png") });
  await page
    .getByRole("button", { name: "Open the next Season", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      /\/direction\/seasons\/\d{4}\/[1-4]\/opening$/.test(url.pathname) &&
      url.searchParams.get("fromFinale") === "1",
  );
  const openingPath = new URL(page.url()).pathname;
  const [, , , year, quarter] = openingPath.split("/");
  expect(isCurrentBecomeSeason(Number(year), Number(quarter))).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Who will inspire this Season?" }),
  ).toBeVisible();
  const characterName = page.getByRole("textbox", {
    name: "Character name",
    exact: true,
  });
  await characterName.fill("Levi Ackerman");
  await page
    .getByRole("textbox", { name: "Source work · optional", exact: true })
    .fill("Attack on Titan");
  await page.reload();
  await expect(characterName).toHaveValue("Levi Ackerman");
  await page.screenshot({
    path: info.outputPath("opening.png"),
    fullPage: true,
  });
  const paused = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/direction/cots" &&
      response.request().method() === "POST" &&
      response.request().postDataJSON()?.action === "DEFER_OPENING",
  );
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  expect((await paused).ok()).toBe(true);
  await page.waitForURL(/opening=paused/, { waitUntil: "networkidle" });
  await visit(page, "/");
  await expect(page).toHaveURL("/");
  const saved = await prisma.userSeason.findUniqueOrThrow({
    where: {
      userId_year_quarter: {
        userId: f.userId,
        year: Number(year),
        quarter: Number(quarter),
      },
    },
  });
  expect(saved.openingCompletedAt).toBeNull();
  expect(await prisma.goal.count({ where: { userId: f.userId } })).toBe(1);
  await page.getByRole("link", { name: /Resume the opening/ }).click();
  await expect(page).toHaveURL(openingPath);
  await expect(characterName).toHaveValue("Levi Ackerman");
  // A resumed Character draft must not activate a Season or rewrite its finale.
  await visit(page, period);
  await page
    .getByRole("link", { name: "Close the chapter", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Leave replay", exact: true }),
  ).toBeVisible();
  const completedTransition = await prisma.seasonTransition.findFirstOrThrow({
    where: { userId: f.userId },
  });
  for (const [label, index] of [
    ["4. What you take with you", 3],
    ["3. What changed", 2],
    ["2. What filled the days", 1],
    ["1. What you brought", 0],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Finale passages" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.locator(`#finale-passage-${index}`)).toBeVisible();
  }
  expect(
    await prisma.seasonTransition.findFirstOrThrow({
      where: { userId: f.userId },
    }),
  ).toEqual(completedTransition);
  await page.getByRole("link", { name: "Leave replay", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(period));
  await writeFile(
    info.outputPath("browser-diagnostics.json"),
    JSON.stringify(
      { errors, errorDetails, runtimeErrors, serverErrors, failedRequests },
      null,
      2,
    ),
  );
  // Playwright's WebKit Console.messageAdded adapter promotes native JavaScript
  // fetch diagnostics to pageerror, including caught requests during unload.
  // Keep every protocol diagnostic above; assert actual browser runtime events.
  expect(runtimeErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
  expect(
    errors.filter(
      (message) =>
        !/[?&]_rsc=[^ ]+ due to access control checks\.$/.test(message),
    ),
  ).toEqual([]);
});

test("first-time opening and active/deep-link guards preserve access", async ({
  page,
}) => {
  test.setTimeout(90000);
  requireReviewTestDatabase();
  const email = `phase7-first-${randomUUID()}@example.test`;
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { name: "First visit", email, password: `Test!${randomUUID()}` },
  });
  expect(response.ok(), `${response.status()}: ${await response.text()}`).toBe(
    true,
  );
  const { user } = await response.json();
  created.push({ id: user.id, email });
  await visit(page, "/");
  await expect(page).toHaveURL(/\/opening\?arrival=season/);
  expect(await prisma.reviewEdition.count({ where: { userId: user.id } })).toBe(
    0,
  );
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.waitForURL(/opening=paused/, { waitUntil: "networkidle" });
  await visit(page, "/");
  await expect(page).toHaveURL("/");
  const domain = await prisma.domain.findFirstOrThrow({
    where: { userId: user.id, slug: "engineering" },
    include: { activityTypes: true },
  });
  await prisma.userSeason.create({
    data: {
      userId: user.id,
      year: 2026,
      quarter: 2,
      title: "A sparse saved chapter",
    },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      domainId: domain.id,
      activityTypeId: domain.activityTypes[0].id,
      engineeringContext: "PERSONAL",
      startedAt: new Date(Date.now() - 3600000),
    },
  });
  await prisma.sessionPause.create({
    data: { sessionId: session.id, startedAt: new Date(Date.now() - 1800000) },
  });
  await visit(page, "/");
  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("season-finale")).toHaveCount(0);
  await prisma.session.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });
  await prisma.sessionPause.updateMany({
    where: { sessionId: session.id },
    data: { endedAt: new Date() },
  });
  await visit(page, "/?existing=work");
  await expect(page).toHaveURL(/existing=work/);
  await expect(page.getByTestId("season-finale")).toHaveCount(0);
});

test("two tabs, direct reduced-motion scene navigation, deferral and an unconfirmed exit stay non-blocking", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const f = await signup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, finale);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#finale-passage-1")).toBeVisible();
  const other = await context.newPage();
  await visit(other, finale);
  await expect(other.getByText(/open in another tab/).first()).toBeVisible();
  await expect(
    other.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await other.close();
  await expect(
    page.getByRole("button", { name: "Open reading view", exact: true }),
  ).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "Finale passages" });
  for (const [label, index] of [
    ["4. What you take with you", 3],
    ["1. What you brought", 0],
    ["3. What changed", 2],
    ["2. What filled the days", 1],
  ] as const) {
    await navigation.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(`#finale-passage-${index}`)).toBeVisible();
    await expect(page.locator(`#finale-passage-${index}`)).toBeFocused();
  }
  await expect(
    page.getByRole("button", { name: "Not now", exact: true }),
  ).toHaveCount(1);
  expect(
    await page
      .locator("#finale-passage-1")
      .evaluate(
        (heading) =>
          getComputedStyle(heading.closest("section")!).animationName,
      ),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Not now", exact: true })
    .first()
    .click();
  await page.waitForURL(/transition=paused/, { waitUntil: "networkidle" });
  await expect
    .poll(
      async () =>
        (
          await prisma.seasonTransition.findFirst({
            where: { userId: f.userId },
          })
        )?.disposition,
    )
    .toBe("DEFERRED");
  await visit(page, "/");
  await expect(page).toHaveURL("/");
  await visit(page, finale);
  await expect(page.locator("#finale-passage-1")).toBeVisible();
  await page.route("**/api/reviews/transition", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Not now", exact: true })
    .first()
    .click();
  await page.waitForURL(/transition=paused/, { waitUntil: "networkidle" });
  await visit(page, "/");
  await expect(page).toHaveURL("/");
});

test("review writing survives conflict and corrections produce explicit editions; sources fail honestly", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const f = await signup(page);
  await visit(page, period);
  const inspect = page.getByRole("button", {
    name: "Inspect sources for Recorded focused time",
  });
  await page.route("**/api/reviews/sources?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Source lookup temporarily unavailable" }),
    }),
  );
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "No qualifying source records",
  );
  await page.keyboard.press("Escape");
  await expect(inspect).toBeFocused();
  await page.unroute("**/api/reviews/sources?**");
  const other = await context.newPage();
  await visit(other, period);
  await other
    .getByLabel("What deserves to stay with you?")
    .fill("The other tab saved a useful lesson.");
  await other
    .getByRole("button", { name: "Save reflection", exact: true })
    .click();
  await expect(
    other.getByText("Your reflection is saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("What deserves to stay with you?")
    .fill("My local words must survive.");
  await page
    .getByRole("button", { name: "Save reflection", exact: true })
    .click();
  await expect(
    page.getByText("The saved reading changed. Your entries are still here."),
  ).toBeVisible();
  await expect(page.getByLabel("What deserves to stay with you?")).toHaveValue(
    "My local words must survive.",
  );
  await page
    .getByRole("button", { name: "Keep my entries", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finalize review", exact: true })
    .click();
  await page.waitForURL(/editionId=/, { waitUntil: "networkidle" });
  await other.close();
  const originalUrl = page.url();
  await prisma.financialTransaction.update({
    where: { id: f.incomeId },
    data: { amountMinor: 47000n },
  });
  await page.reload();
  await expect(
    page.getByText(/evidence.*changed|changed.*evidence/i).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Amend this review", exact: true })
    .click();
  await page
    .getByLabel("What deserves to stay with you?")
    .fill("The payment was corrected; the original lesson remains.");
  await page
    .getByRole("button", { name: "Save amendment", exact: true })
    .click();
  await expect(page).not.toHaveURL(originalUrl);
  await page.waitForLoadState("networkidle");
  expect(
    await prisma.reviewEdition.count({ where: { userId: f.userId } }),
  ).toBe(2);
  await visit(page, originalUrl);
  await expect(
    page
      .locator("blockquote")
      .filter({ hasText: "My local words must survive." })
      .first(),
  ).toBeVisible();
  for (const href of [
    "/reviews/week/2026-06-15",
    "/reviews/month/2026-06-01",
    "/reviews/year/2026-01-01",
  ]) {
    await visit(page, href);
    await expect(page.getByTestId("review-reading")).toBeVisible();
  }
  await visit(page, "/reviews");
  await expect(
    page.getByRole("link", { name: /Season · 2026-04-01/ }).first(),
  ).toBeVisible();
  const anonymous = await context.browser()!.newContext({
    baseURL: `http://localhost:${process.env.BECOME_E2E_PORT ?? 3010}`,
  });
  expect(
    (
      await anonymous.request.get(
        "/api/reviews?timeframe=season&startOn=2026-04-01",
      )
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post("/api/reviews/retrieve", {
        headers: { Origin: "https://untrusted.example" },
        data: {
          type: "FOCUSED_TIME",
          timeframe: "season",
          startOn: "2026-04-01",
        },
      })
    ).status(),
  ).toBe(403);
  await anonymous.close();
});
