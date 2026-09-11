import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { test, expect, type Page } from "./utils/browser-test.util";

async function createDisposableCotsUser(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable COTS QA");
  await page
    .getByTestId("email-input")
    .fill(`cots-opening-${randomUUID()}@example.test`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-cots-password");
  await page.getByTestId("auth-submit").click();
}

test("a new season arrives once and keeps a curated inspiration collection", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.route("**/api/direction/cots", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { action?: string };
      if (body.action === "SUGGEST_IDENTITY") {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            status: "No exact match found. Your name still works.",
          }),
        });
        return;
      }
    }
    await route.continue();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await createDisposableCotsUser(page);
  await expect(page).toHaveURL(
    /\/direction\/seasons\/\d+\/[1-4]\/opening\?arrival=season/,
  );
  await expect(
    page.getByRole("heading", { name: "The next chapter starts here." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Not now" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);

  await page
    .getByRole("textbox", { name: "Carry forward" })
    .fill("A note saved before deferring the ritual.");
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page).toHaveURL("/");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/direction");
  await page.getByRole("link", { name: "Open your season" }).click();
  await expect(
    page.getByRole("textbox", { name: "Carry forward" }),
  ).toHaveValue("A note saved before deferring the ritual.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Who belongs in this chapter?" }),
  ).toBeVisible();

  const source = page.getByRole("combobox", {
    name: "Where do you know them from?",
  });
  await expect(source.locator("option")).toHaveText([
    "Choose a source",
    "Anime",
    "TV show",
    "Movie",
    "Game",
    "Book",
    "Comic",
    "Public figure / real-life person",
  ]);
  await source.selectOption("anime");
  await page
    .getByRole("textbox", { name: "Character name" })
    .fill("Levi Ackerman");
  await page
    .getByRole("textbox", { name: "Anime or manga" })
    .fill("Attack on Titan");
  await page.getByRole("button", { name: "Use this identity" }).click();

  await expect(
    page.getByRole("heading", {
      name: "What feels like Levi Ackerman to you?",
    }),
  ).toBeVisible();
  const imagePath = testInfo.outputPath("cots-alpha-anchor.png");
  await sharp({
    create: {
      width: 320,
      height: 400,
      channels: 4,
      background: { r: 183, g: 119, b: 38, alpha: 0.72 },
    },
  })
    .png()
    .toFile(imagePath);
  await page.getByRole("button", { name: "Add your own image" }).click();
  const imageForm = page.locator('[data-cots-manual="image"]');
  await imageForm.locator('input[type="file"]').setInputFiles(imagePath);
  await imageForm
    .getByRole("textbox", { name: "Alternative text" })
    .fill("A quiet amber field for this season");
  await imageForm
    .getByRole("checkbox", { name: "Use as the season poster" })
    .check();
  await imageForm
    .getByRole("textbox", { name: "Source title" })
    .fill("Created for COTS acceptance");
  await imageForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Your added images" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to words" }).click();

  await expect(
    page.getByRole("heading", { name: "Which words hold the standard?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add words manually" }).click();
  const wordsForm = page.locator('[data-cots-manual="text"]');
  await wordsForm
    .getByRole("textbox", { name: "Quote or paraphrase" })
    .fill("Keep the next move deliberate.");
  await wordsForm
    .getByRole("combobox", { name: "Wording" })
    .selectOption("EXACT");
  await wordsForm
    .getByRole("textbox", { name: "Attribution" })
    .fill("Synthetic acceptance voice");
  await wordsForm
    .getByRole("textbox", { name: /Source title or detail/ })
    .fill("Synthetic acceptance fixture");
  await wordsForm
    .getByRole("checkbox", { name: "Feature on the poster" })
    .check();
  await wordsForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Already in this season")).toBeVisible();

  await page.getByRole("button", { name: "Continue to preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Let the direction feel like yours." }),
  ).toBeVisible();
  const preview = page.locator(".season-poster");
  await expect(preview).toContainText("Levi Ackerman");
  await expect(preview).toContainText("Quote · Source not verified");
  await page.getByRole("button", { name: "Begin this season" }).click();
  await expect(page).toHaveURL(/\/direction\/seasons\/\d+\/[1-4]$/);
  await expect(
    page.getByRole("heading", { name: "Approved collection" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Manage A quiet amber field for this season" })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Remove from loading" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Reuse from a past season" }).click();
  await expect(
    page.getByRole("heading", { name: "Bring a familiar image forward." }),
  ).toBeVisible();
  await expect(
    page.getByText("No other season images are ready to reuse yet."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close past season images" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  expect(
    browserErrors.filter((message) => !message.includes("favicon")),
  ).toEqual([]);
});
