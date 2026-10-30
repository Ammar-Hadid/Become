import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

async function register(page: Page) {
  const email = `redesign-e2e-${randomUUID()}@example.test`;
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Workspace review");
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("disposable-redesign-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return email;
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    })),
  ).toEqual(expect.objectContaining({ width: expect.any(Number) }));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("simple goals keep multiple domain assignments through create, edit and refresh", async ({
  page,
}) => {
  test.setTimeout(180000);
  const email = await register(page);
  await page.goto("/direction/goals/new");
  await expect(
    page.getByRole("button", { name: "Add evidence definition" }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill("Build a consistent creative practice");
  const domains = page.getByRole("combobox", { name: /Domains/ });
  await domains.fill("Engineering");
  await page
    .getByRole("option", { name: /Engineering/ })
    .first()
    .click();
  await domains.fill("Content");
  await page
    .getByRole("option", { name: /Content/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Build a consistent creative practice",
      exact: true,
    }),
  ).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const goal = await prisma.goal.findFirstOrThrow({
    where: { userId: user.id },
    include: { domains: true, criteria: true },
  });
  expect(goal.domains).toHaveLength(2);
  expect(goal.criteria).toHaveLength(0);
  await page.getByRole("link", { name: "Edit goal", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill("Publish a useful project each month");
  await page
    .getByRole("textbox", { name: "What changed?", exact: true })
    .fill("Made the outcome easier to remember.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Publish a useful project each month",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".simple-goal-domains")).toContainText(
    "Engineering",
  );
  await expect(page.locator(".simple-goal-domains")).toContainText("Content");
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["phone", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await noOverflow(page);
    await page.screenshot({
      path: `docs/redesign/screenshots/goal-detail-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/direction/goals");
    await noOverflow(page);
    await page.screenshot({
      path: `docs/redesign/screenshots/goals-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto(`/direction/goals/${goal.id}`);
  }
});

test("Direction pages keep their controls in reach at desktop and phone widths", async ({
  page,
}) => {
  test.setTimeout(240000);
  await register(page);
  const routes = [
    "/direction",
    "/direction/goals",
    "/direction/goals/new",
    "/direction/experiments",
    "/direction/experiments/new",
    "/direction/ideas",
    "/direction/decisions",
    "/direction/decisions/new",
    "/direction/seasons",
  ];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.getByText("Application error", { exact: false }),
      ).toHaveCount(0);
      await noOverflow(page);
      await expect(page.locator("main h1")).toHaveCount(1);
      if (
        width !== 320 &&
        [
          "/direction",
          "/direction/experiments/new",
          "/direction/ideas",
        ].includes(route)
      )
        await page.screenshot({
          path: `docs/redesign/screenshots/${route.slice(1).replaceAll("/", "-")}-${width === 1440 ? "desktop" : "phone"}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
  }
});

test("a collapsed optional section reveals invalid fields without losing the draft", async ({
  page,
}) => {
  await register(page);
  await page.goto("/direction/goals/new");
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill("Keep the important work visible");
  const disclosure = page
    .locator("details")
    .filter({ hasText: "Dates & notes" });
  await disclosure.locator("summary").click();
  await page.locator('[name="startOn"]').fill("");
  await disclosure.locator("summary").click();
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(page.locator('[name="startOn"]')).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "Goal", exact: true }),
  ).toHaveValue("Keep the important work visible");
  await page.locator('[name="startOn"]').fill("2026-10-27");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Keep the important work visible",
      exact: true,
    }),
  ).toBeVisible();
});

test("sign in is readable at desktop and phone widths", async ({ page }) => {
  await page.goto("/sign-in");
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["phone", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId("auth-submit")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: `docs/redesign/screenshots/sign-in-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
