import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type {
  CotsCandidateView,
  CotsCollectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
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
  let candidateSelectionRequest: Record<string, unknown> | null = null;
  let identitySuggestionRequests = 0;
  let imageDiscoveryRequests = 0;
  let textDiscoveryRequests = 0;
  let discoveryPreviewRequests = 0;
  const discoveryPreview = await sharp({
    create: {
      width: 48,
      height: 60,
      channels: 4,
      background: { r: 53, g: 65, b: 83, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.route("**/api/direction/cots/preview/**", async (route) => {
    discoveryPreviewRequests += 1;
    await route.fulfill({ contentType: "image/png", body: discoveryPreview });
  });
  await page.route("**/api/direction/cots", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (body.action === "SUGGEST_IDENTITY") {
        identitySuggestionRequests += 1;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            status: "THROTTLED",
          }),
        });
        return;
      }
      if (body.action === "DISCOVER" && body.kind === "IMAGE") {
        imageDiscoveryRequests += 1;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            identityRevision: body.identityRevision,
            discoveryRevision: body.discoveryRevision,
            queryKey: "image-interaction-fixture",
            items: [
              {
                candidateRef: "image-interaction-candidate",
                provider: "fixture",
                externalId: "fixture-image",
                form: "IMAGE",
                title: "Synthetic interaction preview",
                previewHref:
                  "/api/direction/cots/preview/image-interaction-candidate",
                width: 600,
                height: 750,
                text: null,
                speaker: null,
                sourceUrl: "https://example.com/source",
                sourceWork: "Attack on Titan",
                sourceDetail: "Synthetic interaction source",
                credit: "Fixture artist",
                license: null,
                evidence: "PROVIDER",
                language: "en",
                importable: true,
                unavailableReason: null,
              },
            ],
            nextCursor: null,
            exhausted: true,
            sources: [
              {
                provider: "serpapi",
                status: "UNAVAILABLE",
                message: "Synthetic primary-source failure",
              },
              { provider: "commons", status: "AVAILABLE", message: "" },
            ],
          }),
        });
        return;
      }
      if (body.action === "DISCOVER" && body.kind === "TEXT") {
        textDiscoveryRequests += 1;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            identityRevision: body.identityRevision,
            discoveryRevision: body.discoveryRevision,
            queryKey: "quote-interaction-fixture",
            items: [
              {
                candidateRef: "quote-source-link-candidate",
                provider: "wikiquote",
                externalId: "fixture-source-link",
                form: "SOURCE_LINK",
                title: "Review the source",
                previewHref: null,
                width: null,
                height: null,
                text: null,
                speaker: null,
                sourceUrl: "https://example.com/source-only",
                sourceWork: "Attack on Titan",
                sourceDetail: "No explicit speaker lines were extracted.",
                credit: null,
                license: null,
                evidence: "PROVIDER",
                language: "en",
                importable: false,
                unavailableReason: "This is a source link, not extracted text.",
              },
              {
                candidateRef: "quote-interaction-candidate",
                provider: "wikiquote",
                externalId: "fixture-quote",
                form: "QUOTATION",
                title: "Levi Ackerman",
                previewHref: null,
                width: null,
                height: null,
                text: "A synthetic quotation for interaction testing.",
                speaker: "Levi Ackerman",
                sourceUrl: "https://example.com/quote-source",
                sourceWork: "Attack on Titan",
                sourceDetail: "Synthetic source revision 1",
                credit: null,
                license: null,
                evidence: "COMMUNITY",
                language: "en",
                importable: true,
                unavailableReason: null,
              },
              {
                candidateRef: "quote-navigation-candidate",
                provider: "wikiquote",
                externalId: "fixture-quote-navigation",
                form: "QUOTATION",
                title: "Levi Ackerman",
                previewHref: null,
                width: null,
                height: null,
                text: "A second synthetic quotation stays out of sight.",
                speaker: "Levi Ackerman",
                sourceUrl: "https://example.com/quote-source-2",
                sourceWork: "Attack on Titan",
                sourceDetail: "Synthetic source revision 1",
                credit: null,
                license: null,
                evidence: "COMMUNITY",
                language: "en",
                importable: true,
                unavailableReason: null,
              },
            ],
            nextCursor: "quote-next-fixture",
            exhausted: false,
            sources: [
              { provider: "wikiquote", status: "AVAILABLE", message: "" },
              {
                provider: "animechan",
                status: "SETUP_REQUIRED",
                message: "Synthetic missing provider credential",
              },
            ],
          }),
        });
        return;
      }
      if (body.action === "SELECT") {
        candidateSelectionRequest = body;
        await route.fulfill({
          contentType: "application/json",
          body: "null",
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
  await expect(page.getByTestId("season-opening-ritual")).toBeVisible();
  await expect(
    page.getByText("What came before has taken its shape.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Not now" })).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".mobile-header")).toHaveCount(0);
  await expect(page.getByTestId("mobile-bottom-nav")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Direction navigation" }),
  ).toHaveCount(0);
  await expect(page.locator(".direction-masthead")).toHaveCount(0);
  await expect(
    page.locator(
      '[data-testid="start-timer-trigger"], [data-testid="active-timer-trigger"]',
    ),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);

  await page
    .getByRole("button", { name: "Open the season", exact: true })
    .click();
  const openingHeading = page.getByRole("heading", {
    name: "Open the season",
    exact: true,
  });
  await expect(openingHeading).toBeVisible();
  await expect(openingHeading).toBeFocused();
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
    page.getByRole("heading", { name: "Who belongs in this season?" }),
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
  await page.getByRole("button", { name: "Add Anime or manga" }).click();
  const identityName = page.getByRole("textbox", { name: "Character name" });
  const sourceWork = page.getByRole("textbox", { name: "Anime or manga" });
  await expect(sourceWork).toBeFocused();
  await identityName.fill("Levi Ackerman");
  await expect(
    page.getByText(
      "Suggestions aren’t available right now. Try again in a moment, or continue with something of your own.",
    ),
  ).toBeVisible();
  expect(identitySuggestionRequests).toBe(1);
  await sourceWork.fill("Attack on Titan");
  await expect(
    page.getByText(
      "Suggestions aren’t available right now. Try again in a moment, or continue with something of your own.",
    ),
  ).toHaveCount(0);
  await sourceWork.fill("Attack on Titan: Final Season");
  await page.waitForTimeout(750);
  expect(identitySuggestionRequests).toBe(1);
  await sourceWork.fill("Attack on Titan");
  await identityName.focus();
  await expect(
    page.getByText(
      "Suggestions aren’t available right now. Try again in a moment, or continue with something of your own.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use this identity" }).click();

  const inspirationSteps = page.getByRole("navigation", {
    name: "Inspiration steps",
  });
  await expect(inspirationSteps.getByRole("button")).toHaveCount(5);
  await expect(
    inspirationSteps.getByRole("button", { name: /Standards/ }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByRole("heading", {
      name: "Borrow the quality. Leave the costume.",
    }),
  ).toBeVisible();
  await expect.poll(() => imageDiscoveryRequests).toBe(1);
  await expect.poll(() => discoveryPreviewRequests).toBeGreaterThan(0);
  expect(textDiscoveryRequests).toBe(0);
  await page
    .getByRole("textbox", { name: "What you admire" })
    .fill("Calm judgment under pressure.");
  await page.getByRole("button", { name: "Continue to images" }).click();

  await expect(
    page.getByRole("heading", {
      name: "What feels like Levi Ackerman to you?",
    }),
  ).toBeVisible();
  await expect.poll(() => textDiscoveryRequests).toBe(1);
  await expect(
    page.getByRole("region", { name: "Source availability" }),
  ).toHaveCount(0);
  const suggestion = page
    .locator(".cots-image-card")
    .filter({ hasText: "Synthetic interaction preview" });
  await suggestion.getByText("Source details", { exact: true }).click();
  await expect(
    suggestion.getByRole("link", { name: "Open source" }),
  ).toBeVisible();
  await suggestion
    .getByRole("button", { name: "Select Synthetic interaction preview" })
    .click();
  await expect
    .poll(() => candidateSelectionRequest)
    .toMatchObject({
      action: "SELECT",
      candidateRef: "image-interaction-candidate",
      selected: true,
    });
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
  await expect(
    imageForm.getByRole("checkbox", { name: "Use as the season poster" }),
  ).toHaveCount(0);
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
  await expect(
    page.getByText(
      "Suggestions aren’t available right now. Try again in a moment, or continue with something of your own.",
    ),
  ).toBeVisible();
  await expect(page.getByText("1 of 2", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Review the source", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/animechan/i)).toHaveCount(0);
  await expect(page.getByText(/missing provider credential/i)).toHaveCount(0);
  const quoteSuggestion = page
    .locator(".cots-word-stage")
    .filter({ hasText: "A synthetic quotation for interaction testing." });
  await quoteSuggestion.getByText("Source details", { exact: true }).click();
  await expect(
    quoteSuggestion.getByRole("link", { name: "Open source" }),
  ).toBeVisible();
  await quoteSuggestion
    .getByRole("button", { name: "Keep in this season" })
    .click();
  await expect
    .poll(() => candidateSelectionRequest)
    .toMatchObject({
      action: "SELECT",
      candidateRef: "quote-interaction-candidate",
      selected: true,
    });
  await expect(
    page.getByText("A second synthetic quotation stays out of sight.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next quote" }).click();
  await expect(
    page.getByText("A second synthetic quotation stays out of sight.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("A synthetic quotation for interaction testing.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next quote" }).click();
  await expect(
    page.getByRole("button", { name: "Load more quotes" }),
  ).toBeVisible();
  await expect(page.locator(".cots-word-stage blockquote")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous quote" }).click();
  await page.getByRole("button", { name: "Add words manually" }).click();
  const wordsForm = page.locator('[data-cots-manual="text"]');
  await wordsForm
    .getByRole("textbox", { name: "Quote or paraphrase" })
    .fill("Keep the next move deliberate.");
  await wordsForm
    .getByRole("combobox", { name: "Wording" })
    .selectOption("EXACT");
  await expect(
    wordsForm.getByRole("checkbox", {
      name: "I checked this wording and source.",
    }),
  ).toHaveCount(0);
  await expect(wordsForm.getByText(/Exact wording needs/)).toHaveCount(0);
  await expect(
    wordsForm.getByRole("checkbox", { name: "Feature on the poster" }),
  ).toHaveCount(0);
  await wordsForm.getByRole("button", { name: "Save", exact: true }).click();
  const savedManualQuote = page
    .locator(".cots-word-frame")
    .filter({ hasText: "Keep the next move deliberate." });
  await expect(savedManualQuote).toBeVisible();
  await expect(
    savedManualQuote.getByText("Selected", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Already in this season")).toHaveCount(0);

  await page.getByRole("button", { name: "Manage saved quote" }).click();
  await page.getByRole("menuitem", { name: "Edit quote" }).click();
  const editWordsForm = page.locator('[data-cots-manual="text"]');
  await expect(
    editWordsForm.getByRole("textbox", { name: "Quote or paraphrase" }),
  ).toHaveValue("Keep the next move deliberate.");
  await expect(
    editWordsForm.getByRole("combobox", { name: "Wording" }),
  ).toHaveValue("EXACT");
  await expect(
    editWordsForm.getByRole("checkbox", { name: "Feature on the poster" }),
  ).toHaveCount(0);
  await editWordsForm
    .getByRole("textbox", { name: "Quote or paraphrase" })
    .fill("Keep the next move precise.");
  await editWordsForm.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .locator(".cots-word-frame")
      .filter({ hasText: "Keep the next move precise." }),
  ).toBeVisible();
  await expect(page.getByText("Keep the next move deliberate.")).toHaveCount(0);

  await page.getByRole("button", { name: "Manage saved quote" }).click();
  await page.getByRole("menuitem", { name: "Remove from season" }).click();
  await expect(page.getByText("Keep the next move precise.")).toHaveCount(0);

  await page.getByRole("button", { name: "Add words manually" }).click();
  const replacementWordsForm = page.locator('[data-cots-manual="text"]');
  await replacementWordsForm
    .getByRole("textbox", { name: "Quote or paraphrase" })
    .fill("Move with clarity.");
  await replacementWordsForm
    .getByRole("combobox", { name: "Wording" })
    .selectOption("EXACT");
  await expect(
    replacementWordsForm.getByRole("checkbox", {
      name: "Feature on the poster",
    }),
  ).toHaveCount(0);
  await replacementWordsForm
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    page.locator(".cots-word-frame").filter({ hasText: "Move with clarity." }),
  ).toContainText("Selected");

  await page.getByRole("button", { name: "Continue to finalization" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose what leads the season." }),
  ).toBeVisible();
  await expect(
    page.getByText("Featured is the lead, not the whole collection."),
  ).toBeVisible();
  const featuredImage = page.getByRole("radio", {
    name: /A quiet amber field for this season/,
  });
  await featuredImage.check();
  await expect(featuredImage).toBeChecked();
  await page.getByRole("button", { name: "Feature these words" }).click();
  await expect(
    page.getByRole("button", { name: "Featured quote" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See the season" }).click();
  await expect(
    page.getByRole("heading", { name: "Let the direction feel like yours." }),
  ).toBeVisible();
  const preview = page.locator(".season-poster");
  await expect(page.locator(".season-opening-reveal-poster")).toHaveCSS(
    "background-image",
    "none",
  );
  await expect(preview).toContainText("Levi Ackerman");
  await expect(preview).toContainText("Quote · Source not verified");
  await page.getByRole("button", { name: "Edit card image placement" }).click();
  await expect(
    page.getByRole("heading", { name: "Adjust the featured image" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This focus point is also used by the season card on your dashboard.",
    ),
  ).toBeVisible();
  const imageEditor = page.getByRole("group", {
    name: "Reposition featured image. Drag it or use the arrow keys.",
  });
  const savePlacement = page.getByRole("button", {
    name: "Save placement",
  });
  await expect(imageEditor).toBeFocused();
  await expect(savePlacement).toBeDisabled();
  const editorBounds = await imageEditor.boundingBox();
  expect(editorBounds).not.toBeNull();
  if (!editorBounds) throw new Error("The image editor has no visible bounds.");
  await page.mouse.move(
    editorBounds.x + editorBounds.width / 2,
    editorBounds.y + editorBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    editorBounds.x + editorBounds.width / 2,
    editorBounds.y + editorBounds.height / 2 - 48,
  );
  await page.mouse.up();
  await expect(savePlacement).toBeEnabled();
  await imageEditor.press("ArrowUp");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "Edit card image placement" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Edit card image placement" }).click();
  await page.getByText("Fine tune", { exact: true }).click();
  const verticalPosition = page.getByRole("slider", {
    name: "Vertical image position",
  });
  await verticalPosition.fill("80");
  const editablePosterImage = page.locator(
    ".season-card-placement-preview .season-poster-visual img",
  );
  await expect(editablePosterImage).toHaveCSS("object-position", "50% 80%");
  await page.getByRole("button", { name: "Save placement" }).click();
  await expect(
    page.getByText(
      "Image placement saved. Your dashboard card is updated too.",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".season-opening-reveal-poster .season-poster-visual img"),
  ).toHaveCSS("object-position", "50% 80%");
  await page.getByRole("button", { name: "Begin this season" }).click();
  await expect(page).toHaveURL(/\/direction\/seasons\/\d+\/[1-4]$/);
  await expect(
    page.getByRole("heading", { name: "Approved collection" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".season-poster--home img")).toHaveCSS(
    "object-position",
    "50% 80%",
  );
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Approved collection" }),
  ).toBeVisible();

  const addManually = page.getByRole("button", { name: "Add manually" });
  await expect(addManually).toBeEnabled();
  await addManually.click();
  await page.getByRole("menuitem", { name: "Add an image" }).click();
  const personalImageForm = page
    .locator(".season-inspiration-form")
    .filter({ hasText: "Add one purposeful image." });
  await expect(personalImageForm).toBeInViewport();
  await personalImageForm
    .getByRole("button", { name: "Close image editor" })
    .click();

  const discoverMore = page.getByRole("button", { name: "Discover more" });
  await discoverMore.click();
  const discovery = page.locator(".cots-collection-discovery");
  await expect(discovery).toBeInViewport();
  await expect(discovery).toHaveCSS("border-top-style", "solid");
  await expect(page.locator(".cots-collection-tabs")).toHaveCSS(
    "display",
    "inline-grid",
  );
  await expect(page.getByText("Poster choice", { exact: true })).toHaveCount(0);
  await expect(addManually).toBeEnabled();
  await expect(discoverMore).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Reuse from a past season" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Manage A quiet amber field for this season",
    }),
  ).toBeEnabled();
  const wordsTab = page.getByRole("tab", { name: "Words" });
  await expect(wordsTab).toBeEnabled();
  await wordsTab.click();
  await expect(wordsTab).toHaveAttribute("aria-selected", "true");

  await addManually.click();
  await page.getByRole("menuitem", { name: "Add words" }).click();
  const personalWordsForm = page
    .locator(".season-inspiration-form")
    .filter({ hasText: "Add a quote without blurring its source." });
  await expect(personalWordsForm).toBeInViewport();
  await personalWordsForm
    .getByRole("button", { name: "Close quote editor" })
    .click();

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

test("the season threshold stays focused and becomes still with reduced motion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 720 });
  await createDisposableCotsUser(page);

  const ritual = page.getByTestId("season-opening-ritual");
  await expect(ritual).toBeVisible();
  await expect(page.locator(".sidebar, .mobile-header")).toHaveCount(0);
  await expect(page.getByTestId("mobile-bottom-nav")).toHaveCount(0);
  await expect(
    page.locator(
      '.direction-masthead, .direction-navigation, [data-testid="start-timer-trigger"], [data-testid="active-timer-trigger"]',
    ),
  ).toHaveCount(0);

  const longestMotionMs = await page
    .locator('.season-opening-prelude-lines [data-state="current"]')
    .evaluate((element) => {
      const toMilliseconds = (duration: string) => {
        const value = Number.parseFloat(duration);
        return duration.endsWith("ms") ? value : value * 1000;
      };
      const styles = getComputedStyle(element);
      return Math.max(
        ...styles.transitionDuration.split(",").map(toMilliseconds),
        ...styles.animationDuration.split(",").map(toMilliseconds),
      );
    });
  expect(longestMotionMs).toBeLessThanOrEqual(0.02);

  await page
    .getByRole("button", { name: "Open the season", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Open the season", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Step 1 of 4/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
});

test("reviewing a failed image reveals it and preserves the successful-import state", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const candidates: CotsCandidateView[] = Array.from(
    { length: 8 },
    (_, index) => ({
      candidateRef: `failed-image-navigation-${index + 1}`,
      provider: "fixture",
      externalId: `fixture-${index + 1}`,
      form: "IMAGE",
      title:
        index === 7
          ? "The image that failed to import"
          : `Image possibility ${index + 1}`,
      previewHref: `/api/direction/cots/preview/failed-image-navigation-${index + 1}`,
      width: 600,
      height: 750,
      text: null,
      speaker: null,
      sourceUrl: `https://example.com/image-${index + 1}`,
      sourceWork: "Fixture work",
      sourceDetail: "Synthetic navigation fixture",
      credit: "Fixture artist",
      license: null,
      evidence: "PROVIDER",
      language: "en",
      importable: true,
      unavailableReason: null,
    }),
  );
  let collection: CotsCollectionView = {
    identity: {
      id: "failed-image-identity",
      identityRevision: 1,
      displayName: "Navigation Fixture",
      subjectKind: "FICTIONAL",
      sourceCategory: "anime",
      registryVersion: 1,
      discoveryContextId: "failed-image-context",
      discoveryRevision: 1,
      sourceWork: "Fixture work",
      adaptation: "",
      language: "en",
      savedAt: new Date().toISOString(),
      sourceEntityId: null,
    },
    selectionRevision: 0,
    selections: [],
    limits: { images: 24, quotes: 48 },
  };

  await page.route("**/api/direction/cots/preview/**", async (route) => {
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"/>',
    });
  });
  await page.route("**/api/direction/cots", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    if (body.action === "IDENTITY") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(collection),
      });
      return;
    }
    if (body.action === "SUGGEST_IDENTITY") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [], status: "EXHAUSTED" }),
      });
      return;
    }
    if (body.action === "DISCOVER") {
      const imageDiscovery = body.kind === "IMAGE";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          identityRevision: 1,
          discoveryRevision: 1,
          queryKey: imageDiscovery ? "failed-image-navigation" : "empty-words",
          items: imageDiscovery ? candidates : [],
          nextCursor: null,
          exhausted: true,
          sources: [],
        }),
      });
      return;
    }
    if (body.action === "SELECT") {
      const candidate = candidates.find(
        ({ candidateRef }) => candidateRef === body.candidateRef,
      );
      if (candidate && body.selected === true) {
        collection = {
          ...collection,
          selectionRevision: collection.selectionRevision + 1,
          selections: [
            ...collection.selections,
            {
              id: `selection-${candidate.candidateRef}`,
              candidateRef: candidate.candidateRef,
              candidate,
              identityId: collection.identity!.id,
              sourceCategory: "anime",
              sourceWork: "Fixture work",
              adaptation: "",
              status: "SELECTED",
              desiredPoster: false,
              mediaId: null,
              quoteId: null,
              error: null,
            },
          ],
        };
      } else if (candidate && body.selected === false) {
        collection = {
          ...collection,
          selectionRevision: collection.selectionRevision + 1,
          selections: collection.selections.filter(
            ({ candidateRef }) => candidateRef !== candidate.candidateRef,
          ),
        };
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(collection),
      });
      return;
    }
    if (body.action === "CONFIRM") {
      collection = {
        ...collection,
        selectionRevision: collection.selectionRevision + 1,
        selections: collection.selections.map((selection, index) =>
          index === 0
            ? { ...selection, status: "READY", mediaId: "ready-media" }
            : {
                ...selection,
                status: "FAILED",
                error: "The image host blocked this download.",
              },
        ),
      };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(collection),
      });
      return;
    }
    await route.continue();
  });

  await page.setViewportSize({ width: 960, height: 820 });
  await createDisposableCotsUser(page);
  await page
    .getByRole("button", { name: "Open the season", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Where do you know them from?" })
    .selectOption("anime");
  await page
    .getByRole("textbox", { name: "Character name" })
    .fill("Navigation Fixture");
  await page.getByRole("button", { name: "Use this identity" }).click();
  await page.getByRole("button", { name: "Continue to images" }).click();

  const successfulCard = page
    .locator(".cots-image-card")
    .filter({ hasText: "Image possibility 1" });
  const failedCard = page
    .locator(".cots-image-card")
    .filter({ hasText: "The image that failed to import" });
  await successfulCard.getByRole("button", { name: /Select/ }).click();
  await failedCard.getByRole("button", { name: /Select/ }).click();
  await page.getByRole("button", { name: /Continue · save 2 images/ }).click();
  await expect(page.locator(".cots-word-gallery")).toHaveCount(0);
  await expect(page.locator('[aria-label="Browse quotes"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Review failed images" }).click();

  const removeFailedImage = failedCard.getByRole("button", {
    name: "Remove",
    exact: true,
  });
  await expect(removeFailedImage).toBeFocused();
  await removeFailedImage.click();
  await expect(
    page.getByRole("button", { name: "Continue to words" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue without images" }),
  ).toHaveCount(0);
});

test("identity suggestions stay anchored to focus and resolve into a removable selection", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.route("**/api/direction/cots", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    if (body.action === "DISCOVER") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          identityRevision: body.identityRevision,
          discoveryRevision: body.discoveryRevision,
          queryKey: "identity-removal-fixture",
          items: [],
          nextCursor: null,
          exhausted: true,
          sources: [],
        }),
      });
      return;
    }
    if (body.action !== "SUGGEST_IDENTITY") {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "Q317521",
            label: "Elon Musk",
            description: "American businessman (born 1971)",
            subjectKind: "PERSON",
          },
          {
            id: "Q999999",
            label: "Elon Musk: SpaceX, Mars, Tesla Autopilot",
            description: "Lex Fridman Podcast #252",
            subjectKind: "UNKNOWN",
          },
        ],
        status: "",
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await createDisposableCotsUser(page);
  const ritual = page.getByTestId("season-opening-ritual");
  const homeOpening = page.getByRole("link", { name: "Begin the opening" });
  await expect
    .poll(async () => (await ritual.count()) + (await homeOpening.count()))
    .toBeGreaterThan(0);
  if (await homeOpening.isVisible()) {
    await homeOpening.click({ timeout: 2_000 }).catch(() => undefined);
  }
  await expect(ritual).toBeVisible();
  const preludeContinue = page.getByRole("button", {
    name: "Open the season",
    exact: true,
  });
  if ((await preludeContinue.count()) > 0) await preludeContinue.click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Who belongs in this season?" }),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: "Where do you know them from?" })
    .selectOption("person");
  await expect(
    page.getByRole("textbox", { name: "Known for (optional)" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Era, team, or role (optional)" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add Known for (optional)" }).click();
  await page
    .getByRole("button", {
      name: "Add Era, team, or role (optional)",
    })
    .click();
  const nameField = page.getByRole("textbox", { name: "Person’s name" });
  const knownForField = page.getByRole("textbox", {
    name: "Known for (optional)",
  });
  const roleField = page.getByRole("textbox", {
    name: "Era, team, or role (optional)",
  });
  await page.waitForTimeout(500);
  const roleBoxBefore = await roleField.boundingBox();

  await nameField.fill("Elon Musk");
  const suggestions = page.locator(".cots-identity-suggestions");
  await expect(suggestions).toBeVisible();
  const nameBox = await nameField.boundingBox();
  const popupBox = await suggestions.boundingBox();
  const roleBoxWithPopup = await roleField.boundingBox();
  if (!nameBox || !popupBox || !roleBoxBefore || !roleBoxWithPopup)
    throw new Error("Identity suggestion geometry was unavailable.");
  expect(Math.abs(nameBox.x - popupBox.x)).toBeLessThanOrEqual(1);
  expect(popupBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
  expect(popupBox.y - (nameBox.y + nameBox.height)).toBeLessThan(20);
  expect(popupBox.y + popupBox.height).toBeGreaterThan(roleBoxWithPopup.y);
  expect(roleBoxWithPopup.y).toBe(roleBoxBefore.y);
  await expect
    .poll(() =>
      suggestions.evaluate((element) => ({
        position: getComputedStyle(element).position,
        zIndex: getComputedStyle(element).zIndex,
      })),
    )
    .toEqual({ position: "absolute", zIndex: "20" });

  await knownForField.focus();
  await expect(suggestions).toHaveCount(0);
  await nameField.focus();
  await expect(suggestions).toBeVisible();
  await suggestions
    .getByRole("button", { name: /Elon Musk American businessman/ })
    .click();

  const selectedIdentity = page.locator(".cots-identity-selected");
  await expect(selectedIdentity).toContainText("Elon Musk");
  await page
    .getByRole("button", { name: "Use this identity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Borrow the quality. Leave the costume.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to images" }).click();
  await expect(
    page.getByRole("heading", { name: "What feels like Elon Musk to you?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Borrow the quality. Leave the costume.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Who belongs in this season?" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Who belongs in this season?" }),
  ).toBeVisible();
  await expect(selectedIdentity).toContainText("Saved identity");
  await expect(
    page.getByRole("textbox", { name: "Person’s name" }),
  ).toHaveCount(0);
  const removeIdentity = page.getByRole("button", {
    name: "Remove Elon Musk",
  });
  await selectedIdentity.hover();
  await expect
    .poll(() =>
      removeIdentity.evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await removeIdentity.hover();
  await expect
    .poll(() =>
      removeIdentity.evaluate((element) => getComputedStyle(element).color),
    )
    .toBe("rgb(229, 103, 103)");
  await removeIdentity.click();

  const restoredNameField = page.getByRole("textbox", {
    name: "Person’s name",
  });
  await expect(restoredNameField).toBeVisible();
  await expect(restoredNameField).toBeFocused();
  await expect(restoredNameField).toHaveValue("");
  await expect(suggestions).toHaveCount(0);

  await restoredNameField.fill("Elon Musk");
  await expect(restoredNameField).toBeVisible();
  await expect(restoredNameField).toHaveValue("Elon Musk");
  await expect(selectedIdentity).toHaveCount(0);
});
