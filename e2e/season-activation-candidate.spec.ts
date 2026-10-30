import { test, expect } from "@playwright/test";
const route = "/season-activation-candidate?year=2027&quarter=2";

test("activation recap is dynamic, complete and responsive without model calls", async ({
  page,
}) => {
  const errors: string[] = [];
  const apiCalls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiCalls.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "become-opening-layout-preview-v1:2027:2",
      JSON.stringify({
        name: "A different character",
        work: "A different source",
        adaptation: "A selected adaptation",
        setting: "A coastal observatory",
        visualDirection: "Soft midnight light",
      }),
    ),
  );
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your Season is ready.",
  );
  await expect(
    page.getByText("Season 2 · 2027", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".activation-identity")).toContainText(
    "A different character",
  );
  await expect(page.locator(".activation-identity")).toContainText(
    "A different source · A selected adaptation",
  );
  await expect(page.locator(".activation-recap-list > div")).toHaveCount(4);
  await expect(
    page.locator(".activation-recap.become-featured-card"),
  ).toHaveAttribute("data-facing", "left");
  await expect(page.locator(".activation-recap")).toContainText(
    "A coastal observatory",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "Soft midnight light",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "42 reviewed compositions",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "7 chapters · 3 pace states",
  );
  await expect(page.locator(".activation-portrait")).toHaveCount(0);
  await expect(page.locator(".activation-recap")).not.toContainText(
    "Reserved, observant",
  );
  await expect(
    page.getByRole("button", { name: "Activate Season", exact: true }),
  ).toBeEnabled();
  const areas = await page
    .locator(".activation-review")
    .evaluate((el) => getComputedStyle(el).gridTemplateAreas);
  const width = await page.evaluate(() => innerWidth);
  expect(areas).toBe(
    width < 1024
      ? '"introduction" "recap" "action"'
      : '"introduction recap" "action recap"',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("activation is explicit, guards duplicate attempts, retains failed recap and retries", async ({
  page,
}) => {
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Activate Season", exact: true }),
  ).toBeEnabled();
  await page.getByText("Review states · sample only", { exact: true }).click();
  await page
    .getByRole("button", { name: "Fail next activation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Activate Season", exact: true })
    .evaluate((el) => {
      if (el instanceof HTMLButtonElement) {
        el.click();
        el.click();
      }
    });
  await expect(
    page.getByRole("button", { name: "Activating Season…", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".activation-recap-list > div")).toHaveCount(4);
  await expect(page.locator('.activation-error[role="alert"]')).toContainText(
    "Activation failed in this preview",
  );
  await expect(
    page.getByText("Preview activation attempts: 1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Activate Season", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Preview activation complete.",
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    page.getByText("Preview activation attempts: 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This demonstrates the final action. Your actual Season has not changed.",
    ),
  ).toBeVisible();
});

test("long content, portrait crop, motion controls and local save failure remain usable", async ({
  page,
}) => {
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Activate Season", exact: true }),
  ).toBeEnabled();
  await page.getByText("Review states · sample only", { exact: true }).click();
  await page.getByRole("button", { name: "Long content", exact: true }).click();
  await expect(page.locator(".activation-identity")).toContainText(
    "A very long character name",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Cropped portrait", exact: true })
    .click();
  await expect(page.locator(".activation-portrait img")).toHaveCSS(
    "object-position",
    "40% 35%",
  );
  await page
    .getByRole("button", { name: "Pause motion", exact: true })
    .press("Enter");
  await expect(page.locator(".become-ambient-light")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".activation-recap")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .press("Enter");
  await expect(page.locator(".become-ambient-light")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await expect(page.locator(".activation-recap")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".activation-recap .become-featured-card__face")
      .evaluate((el) => getComputedStyle(el, "::before").animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".become-ambient-light__field")
      .evaluate((el) => getComputedStyle(el, "::before").animationName),
  ).toBe("none");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page
    .getByRole("button", { name: "Save and leave", exact: true })
    .click();
  await expect(page.locator('.activation-error[role="alert"]')).toContainText(
    "Save failed",
  );
  await expect(page).toHaveURL(/season-activation-candidate/);
});
