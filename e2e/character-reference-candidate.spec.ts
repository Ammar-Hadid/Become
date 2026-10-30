import { expect, test, type Page } from "@playwright/test";
const path = "/character-reference-candidate";
const imageRoute = "**/api/design-review/character-references/images/*";
const identity = (page: Page) =>
  page.getByRole("region", { name: "Recognized character" });
async function changeCharacter(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Change character", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Change character", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}

test("recognized identity sits within world and mood, and Continue needs no confirmation", async ({
  page,
}) => {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto(path);
  await expect(page).toHaveTitle("Character recognition preview · Become");
  await expect(
    identity(page).getByRole("heading", { name: "Levi", exact: true }),
  ).toBeVisible();
  await expect(
    identity(page).getByRole("img", { name: "Levi · from the show" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /Yes, this character|Confirm|Next source image|Preview tools|Upload reference/,
    }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("list", { name: "Season preparation" })
      .getByText("Confirm", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Setting", { exact: true })
    .fill("A city above the clouds");
  await page
    .getByLabel("Mood & atmosphere", { exact: true })
    .fill("Quiet and hopeful");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your direction, together." }),
  ).toBeFocused();
  await expect(
    page.getByText("A city above the clouds", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Quiet and hopeful", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("YOUR ENTRIES · PREVIEW ONLY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit world & mood" }).click();
  await expect(page.getByLabel("Setting", { exact: true })).toHaveValue(
    "A city above the clouds",
  );
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("edition drawer keeps source covers and years; changing edition preserves the form and focus", async ({
  page,
}) => {
  await page.goto(path);
  await expect(
    identity(page).getByRole("img", { name: "Levi · from the show" }),
  ).toBeVisible();
  await page.getByLabel("Setting", { exact: true }).fill("My own world");
  const change = page.getByRole("button", {
    name: "Change version",
    exact: true,
  });
  await change.click();
  const drawer = page.getByRole("dialog", { name: "Choose your version" });
  await expect(
    drawer.getByRole("button", { name: "Close version selection" }),
  ).toBeFocused();
  await expect(
    drawer.getByRole("heading", { name: "TV anime", exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("heading", { name: "Manga", exact: true }),
  ).toBeAttached();
  await expect(drawer.locator("img").first()).toBeVisible();
  await drawer
    .getByRole("button", { name: /Attack on Titan.*Manga.*2009/ })
    .click();
  await expect(drawer).not.toBeVisible();
  await expect(
    identity(page).getByText("Manga · 2009", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "No picture for this edition" }),
  ).toBeVisible();
  await expect(change).toBeFocused();
  await expect(page.getByLabel("Setting", { exact: true })).toHaveValue(
    "My own world",
  );
  await change.click();
  await drawer
    .getByRole("button", { name: /^Attack on Titan TV anime · 2013/ })
    .click();
  await expect(
    identity(page).getByRole("img", { name: "Levi · from the show" }),
  ).toBeVisible();
  await change.click();
  await page.keyboard.press("Escape");
  await expect(change).toBeFocused();
});

test("one identity picture is requested and its loading never blocks Continue", async ({
  page,
}) => {
  const urls = new Set<string>();
  await page.route(imageRoute, (route) => {
    urls.add(route.request().url());
  });
  await page.goto(path);
  await expect(
    page.getByText("Loading picture…", { exact: true }),
  ).toBeVisible();
  await expect(
    identity(page).getByRole("heading", { name: "Levi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your direction, together." }),
  ).toBeVisible();
  expect(urls.size).toBe(1);
});

test("picture deadline and retry preserve world and mood", async ({ page }) => {
  await page.clock.install();
  let stalled = true;
  await page.route(imageRoute, (route) => {
    if (!stalled) return route.continue();
  });
  await page.goto(path);
  await expect(
    page.getByText("Loading picture…", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Mood & atmosphere", { exact: true })
    .fill("Warm and quiet");
  await page.clock.fastForward(8_100);
  await expect(
    page.getByRole("button", { name: "Retry picture" }),
  ).toBeVisible();
  await expect(page.getByText("Loading picture…", { exact: true })).toHaveCount(
    0,
  );
  stalled = false;
  await page.getByRole("button", { name: "Retry picture" }).click();
  await expect(
    identity(page).getByRole("img", { name: "Levi · from the show" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Mood & atmosphere", { exact: true }),
  ).toHaveValue("Warm and quiet");
});

test("correction cancels stale pictures without losing the world draft", async ({
  page,
}) => {
  const pending: import("@playwright/test").Route[] = [];
  let hold = true;
  await page.route(imageRoute, (route) => {
    if (hold) pending.push(route);
    else return route.continue();
  });
  await page.goto(path);
  await page.getByLabel("Setting", { exact: true }).fill("A seaside village");
  hold = false;
  await changeCharacter(page, "Kaoruko Waguri");
  await expect(
    identity(page).getByRole("img", { name: "Kaoruko Waguri · from the show" }),
  ).toBeVisible();
  for (const route of pending) await route.continue().catch(() => {});
  await expect(
    identity(page).getByRole("heading", {
      name: "Kaoruko Waguri",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Levi · from the show" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Setting", { exact: true })).toHaveValue(
    "A seaside village",
  );
  await expect(
    page.getByRole("button", { name: "Change character", exact: true }),
  ).toBeFocused();
});

test("broken pictures, reduced motion and corrections on the summary remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(imageRoute, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/webp",
      body: "invalid image",
    }),
  );
  await page.goto(path);
  await expect(
    page.getByRole("button", { name: "Retry picture" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(
    page.getByRole("button", { name: "Resume motion" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.unroute(imageRoute);
  await changeCharacter(page, "Rintarou Okabe");
  await expect(
    identity(page).getByRole("img", { name: "Rintarou Okabe · from the show" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your direction, together." }),
  ).toBeVisible();
  const change = page.getByRole("button", {
    name: "Change character",
    exact: true,
  });
  await change.click();
  await expect(
    page.getByRole("button", { name: "Close character selection" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(change).toBeFocused();
});
