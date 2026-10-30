import { randomUUID } from "node:crypto";
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
  await expect(page).toHaveURL(/\/direction\/seasons\/\d{4}\/[1-4]\/opening/);
  await expect(page.getByTestId("season-opening-ritual")).toBeVisible();
  await expect(page.locator(".become-season-ritual")).toBeVisible();
}

test("character-first onboarding contains the phone viewport with reduced motion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 720 });
  await createDisposableCotsUser(page);
  await expect(
    page.getByRole("heading", { name: "Create your Season", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Who will inspire this Season?" }),
  ).toBeVisible();
  await expect(
    page.locator(".season-opening-progress, .cots-subnav"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Character name" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  const openingUrl = new URL(page.url());
  await page
    .getByRole("textbox", { name: "Character name", exact: true })
    .fill("Kept local character");
  const deferred = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/direction/cots") &&
      response.request().method() === "POST" &&
      response.request().postDataJSON().action === "DEFER_OPENING",
  );
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  expect((await deferred).ok()).toBe(true);
  openingUrl.search = "";
  await page.goto(openingUrl.toString());
  await expect(
    page.getByRole("textbox", { name: "Character name", exact: true }),
  ).toHaveValue("Kept local character");
});

test("two-question opening recognizes inline and preserves entries through version and character corrections", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const candidate = {
    id: "anilist:268676",
    name: "Kaoruko Waguri",
    nativeName: "和栗薫子",
    aliases: [],
    description: "Retrieved fixture",
    sourceUrl: "https://anilist.co/character/268676",
    imageUrl:
      "https://kaoruhana-anime.com/assets/img/chara/img_main_chara_2.png",
    images: ["main", "sub"].map((kind) => ({
      href: `https://kaoruhana-anime.com/assets/img/chara/img_${kind}_chara_2.png`,
      alt: `Kaoruko Waguri ${kind} source image`,
      sourceUrl: "https://kaoruhana-anime.com/character/",
      sourceLabel: "Official anime character page",
    })),
    works: [
      {
        id: 181444,
        catalogueId: 59845,
        title: "The Fragrant Flower Blooms With Dignity",
        adaptation: "TV anime",
        sourceUrl: "https://anilist.co/anime/181444",
      },
      {
        id: 140475,
        catalogueId: 139892,
        title: "The Fragrant Flower Blooms With Dignity",
        adaptation: "Manga",
        sourceUrl: "https://anilist.co/manga/140475",
      },
    ],
  };
  await page.route("**/api/direction/cots", async (route) => {
    if (
      route.request().method() !== "POST" ||
      route.request().postDataJSON().action !== "LOOKUP_CHARACTER"
    )
      return route.continue();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [candidate],
        suggestedId: candidate.id,
        suggestedWorkId: 181444,
        aiUsed: false,
        notice: "Catalogue fixture; no model response.",
      }),
    });
  });
  await createDisposableCotsUser(page);
  await page
    .getByRole("textbox", { name: "Character name" })
    .fill("Kaoruko Waguri");
  await page.getByRole("button", { name: "Find my character" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shape the world of your Season.",
  );
  const recognition = page.getByRole("region", {
    name: "Recognized character",
  });
  await expect(recognition).toContainText("Kaoruko Waguri");
  await expect(
    page.getByRole("button", { name: "Yes, this character" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Where should this Season take place?", { exact: true })
    .fill("A coastal city");
  await page
    .getByLabel("How should it feel and look?", { exact: true })
    .fill("Warm morning light");
  await page
    .getByRole("button", { name: "Change version", exact: true })
    .click();
  const drawer = page.getByRole("dialog", { name: "Choose your version" });
  await drawer.getByRole("button", { name: /Manga/ }).click();
  await expect(drawer).not.toBeVisible();
  await expect(recognition).toContainText("Manga");
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("A coastal city");
  await page
    .getByRole("button", { name: "Change character", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Who will inspire this Season?",
  );
  await expect(
    page.getByRole("textbox", { name: "Character name", exact: true }),
  ).toHaveValue("Kaoruko Waguri");
  await expect(page.locator(".living-editor")).toHaveCount(0);
});

test("saved identity resumes the guided opening and retired Studio links redirect", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await createDisposableCotsUser(page);
  const opening = new URL(page.url());
  const [, year, quarter] = opening.pathname.match(
    /seasons\/(\d{4})\/([1-4])\/opening/,
  )!;
  const response = await page.request.post("/api/direction/cots", {
    headers: { Origin: opening.origin },
    data: {
      action: "IDENTITY",
      year: Number(year),
      quarter: Number(quarter),
      displayName: "Workspace character",
      sourceCategory: "anime",
      sourceWork: "Workspace source",
      adaptation: "TV anime",
      expectedIdentityRevision: 0,
    },
  });
  expect(response.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shape the world of your Season.",
  );
  await expect(
    page.getByRole("region", { name: "Recognized character" }),
  ).toContainText("Workspace character");
  await expect(page.locator(".living-editor")).toHaveCount(0);
  const workspace = page.getByRole("region", {
    name: "Season preparation workspace",
  });
  await expect(workspace.getByRole("textbox")).toHaveCount(2);
  await page
    .getByLabel("Where should this Season take place?", { exact: true })
    .fill("Saved world draft");
  await page
    .getByLabel("How should it feel and look?", { exact: true })
    .fill("Soft gold daylight");
  await page.reload();
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("Saved world draft");
  await expect(
    page.getByRole("link", { name: "Advanced editing", exact: true }),
  ).toHaveCount(0);
  await page.goto(
    `/direction/seasons/${year}/${quarter}/living?stage=reference`,
  );
  await expect(page).toHaveURL(
    new RegExp(`/direction/seasons/${year}/${quarter}/opening$`),
  );
  await expect(page.locator(".living-editor")).toHaveCount(0);
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("Saved world draft");
  for (const action of [
    "REUSE_IMAGE",
    "MEDIA_PREFERENCES",
    "QUOTE_PREFERENCES",
    "MANUAL_TEXT",
    "DISCOVER",
    "PREFLIGHT",
  ]) {
    const response = await page.request.post("/api/direction/cots", {
      headers: { Origin: new URL(page.url()).origin },
      data: { action },
    });
    expect(response.status()).toBe(400);
  }
  for (const path of [
    "/api/direction/cots/upload",
    "/api/direction/media/upload",
  ])
    expect([404, 405]).toContain((await page.request.post(path)).status());
});
