import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";

test("real onboarding endpoints explain setup and expired workers across refresh", async ({
  page,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `onboarding-health-${randomUUID()}@example.test`;
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable onboarding health QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("disposable-onboarding-health-password");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("season-opening-ritual")).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const locator = { year: 2027, quarter: 3 };
  await page.goto("/direction/seasons/2027/3/opening");
  const headers = { origin: baseURL! };
  const identity = await page.request.post("/api/direction/cots", {
    headers,
    data: {
      action: "IDENTITY",
      ...locator,
      expectedIdentityRevision: 0,
      displayName: "Fixture Character",
      sourceCategory: "anime",
      sourceWork: "Fixture Work",
      adaptation: "TV anime",
    },
  });
  expect(identity.ok(), await identity.text()).toBe(true);
  const prepared = await page.request.post(
    "/api/direction/seasons/onboarding",
    {
      headers,
      data: {
        action: "prepare",
        ...locator,
        operationKey: randomUUID(),
        expectedRevision: 0,
      },
    },
  );
  expect(prepared.ok(), await prepared.text()).toBe(true);
  await page.reload();
  await page
    .getByLabel("Where should this Season take place?", { exact: true })
    .fill("A quiet observatory");
  await page
    .getByLabel("How should it feel and look?", { exact: true })
    .fill("Warm late afternoon light");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText(/Assign a model profile to Character research/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("A quiet observatory");
  expect(await prisma.nexoRun.count({ where: { userId: user.id } })).toBe(0);
  const run = await prisma.seasonOnboardingRun.findFirstOrThrow({
    where: { userId: user.id },
  });
  await prisma.seasonOnboardingRun.update({
    where: { id: run.id },
    data: {
      stage: "ASSEMBLING",
      status: "RUNNING",
      leaseToken: randomUUID(),
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  await page.reload();
  await expect(page.locator(".preparation-stage")).toHaveAttribute(
    "data-composition",
    "focus",
  );
  await page.getByText("Details", { exact: true }).click();
  await expect(page.locator(".preparation-error-detail")).toContainText(
    "worker stopped during a call",
  );
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.guided-working[aria-busy="true"]')).toHaveCount(
    0,
  );
  await page.screenshot({
    path: `/private/tmp/become-onboarding-recovery-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText(/Assign a model profile to Character research/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  expect(
    (
      await prisma.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: run.id },
      })
    ).status,
  ).toBe("FAILED");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("A quiet observatory");
  await prisma.seasonOnboardingRun.update({
    where: { id: run.id },
    data: {
      stage: "GENERATING_BANNER",
      status: "FAILED",
      error: "Fixture image failure; reservation retained.",
    },
  });
  await page.reload();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await expect(page.locator(".become-artwork-upload")).toHaveCount(1);
  expect(
    (
      await prisma.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: run.id },
      })
    ).bannerMethod,
  ).toBe("MANUAL");
  expect(
    await prisma.livingSeasonImageRun.count({ where: { userId: user.id } }),
  ).toBe(0);
  expect(errors).toEqual([]);
});
