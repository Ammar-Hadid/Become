import { randomUUID } from "node:crypto";
import type { Route } from "@playwright/test";
import { test, expect, type Page } from "./utils/browser-test.util";

async function createDisposableDirectionUser(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `direction-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable direction QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-direction-password");
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL("/");
}

async function expectStyledHomeSeasonCard(page: Page) {
  const card = page.locator(".season-home");
  const poster = card.locator(".season-poster--home");

  await expect(card).toBeVisible();
  await expect(poster).toBeVisible();
  await expect(poster).toHaveCSS("display", "grid");
  await expect(poster).toHaveCSS("border-top-style", "solid");

  const layout = await poster.evaluate((element) => {
    const styles = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const tracks = styles.gridTemplateColumns
      .split(" ")
      .filter((track) => track.length > 0);

    return {
      backgroundImage: styles.backgroundImage,
      height: bounds.height,
      tracks: tracks.length,
      width: bounds.width,
    };
  });

  expect(layout.backgroundImage).not.toBe("none");
  expect(layout.height).toBeGreaterThan(290);
  expect(layout.width).toBeGreaterThan(250);
  expect(layout.tracks).toBe(
    (page.viewportSize()?.width ?? 1280) <= 820 ? 1 : 2,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function enterSeasonOpeningStageTwo(page: Page, carryForward = "") {
  await page.goto("/direction");
  await page.getByRole("link", { name: "Open your season" }).click();
  const continueButton = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  await expect(continueButton).toBeEnabled();
  if (carryForward)
    await page
      .getByRole("textbox", { name: "Carry forward" })
      .fill(carryForward);
  await continueButton.click();
  await expect(
    page.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a new goal" }),
  ).toBeEnabled();
  return page.url();
}

function seasonApiFromOpeningUrl(openingUrl: string) {
  const match = new URL(openingUrl).pathname.match(
    /\/direction\/seasons\/(\d+)\/([1-4])\/opening/,
  );
  if (!match) throw new Error(`Unexpected season opening URL: ${openingUrl}`);
  return `/api/direction/seasons/${match[1]}/${match[2]}`;
}

function waitForSeasonDraftSave(page: Page, carryForward?: string) {
  return page.waitForResponse((response) => {
    if (
      new URL(response.url()).pathname !== "/api/direction/commands" ||
      response.status() < 200 ||
      response.status() >= 300
    )
      return false;
    const body = response.request().postDataJSON() as {
      type?: string;
      draft?: { answers?: { carryForward?: string } };
    };
    return (
      body.type === "SAVE_SEASON" &&
      (carryForward === undefined ||
        body.draft?.answers?.carryForward === carryForward)
    );
  });
}

function waitForSeasonReview(page: Page, seasonApi: string) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === seasonApi && response.ok(),
  );
}

test("the season card keeps its responsive layout on a cold Home load", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await createDisposableDirectionUser(page);

  // A document reload drops CSS retained from previously visited App Router
  // segments and catches route-owned styles leaking into this shared card.
  await page.reload();
  await expectStyledHomeSeasonCard(page);

  await page.getByRole("link", { name: "Direction", exact: true }).click();
  await expect(page).toHaveURL(/\/direction$/);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expectStyledHomeSeasonCard(page);
});

test("goal library controls and summaries stay readable on narrow mobile screens", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await createDisposableDirectionUser(page);

  const goalTitle = "Turn skill into real-world proof";
  await page.goto("/direction/goals/new");
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill(goalTitle);
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { name: goalTitle })).toBeVisible();
  await page.goto(`/direction/goals?search=${encodeURIComponent(goalTitle)}`);

  const archiveCheckbox = page.getByRole("checkbox", { name: "Archived" });
  await expect(archiveCheckbox).toBeVisible();
  const checkboxSize = await archiveCheckbox.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  expect(checkboxSize).toEqual({ height: 16, width: 16 });

  const summary = page.getByRole("link", { name: new RegExp(goalTitle) });
  await expect(summary).toBeVisible();
  const summaryLayout = await summary.evaluate((element) => {
    const titleRow = element.querySelector<HTMLElement>(
      ".direction-goal-title-row",
    );
    const title = titleRow?.querySelector<HTMLElement>("h3");
    const bounds = element.getBoundingClientRect();
    const titleBounds = title?.getBoundingClientRect();

    return {
      flexDirection: titleRow ? getComputedStyle(titleRow).flexDirection : null,
      overflowsViewport: element.scrollWidth > element.clientWidth,
      summaryWidth: bounds.width,
      titleWidth: titleBounds?.width ?? 0,
    };
  });

  expect(summaryLayout.flexDirection).toBe("column");
  expect(summaryLayout.overflowsViewport).toBe(false);
  expect(summaryLayout.titleWidth).toBeGreaterThan(
    summaryLayout.summaryWidth * 0.6,
  );
});

test("featured season quotes expand into a readable mobile card", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await createDisposableDirectionUser(page);
  await page.goto("/direction");
  await page.getByRole("link", { name: "Open your season" }).click();

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Whose qualities belong in this chapter?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Begin this season" }).click();

  const quoteText =
    "The only thing standing between you and outrageous success is continuous progress.";
  await page.getByRole("button", { name: "Add quote" }).click();
  await page
    .getByRole("textbox", { name: "Quote or paraphrase" })
    .fill(quoteText);
  await page
    .getByRole("textbox", { name: "Attribution — optional" })
    .fill("Dan Waldschmidt");
  await page.getByRole("button", { name: "Save quote" }).click();

  const quoteCard = page.locator(".season-quote-row").filter({
    hasText: quoteText,
  });
  await expect(quoteCard).toBeVisible();
  const layout = await quoteCard.evaluate((element) => {
    const quote = element.querySelector<HTMLElement>("blockquote");
    const featured = element.querySelector<HTMLElement>(
      ".season-quote-featured",
    );
    const star = featured?.querySelector<SVGElement>("svg");
    const quoteBounds = quote?.getBoundingClientRect();
    const featuredBounds = featured?.getBoundingClientRect();
    const starBounds = star?.getBoundingClientRect();

    return {
      featuredAlignment:
        featuredBounds && starBounds
          ? Math.abs(
              featuredBounds.top +
                featuredBounds.height / 2 -
                (starBounds.top + starBounds.height / 2),
            )
          : null,
      overflows: element.scrollWidth > element.clientWidth,
      quoteHeight: quoteBounds?.height ?? 0,
      quoteLineHeight: quote
        ? Number.parseFloat(getComputedStyle(quote).lineHeight)
        : 0,
      quoteWhiteSpace: quote ? getComputedStyle(quote).whiteSpace : null,
    };
  });

  expect(layout.quoteWhiteSpace).toBe("normal");
  expect(layout.quoteHeight).toBeGreaterThan(layout.quoteLineHeight * 2);
  expect(layout.featuredAlignment).not.toBeNull();
  expect(layout.featuredAlignment!).toBeLessThanOrEqual(1);
  expect(layout.overflows).toBe(false);
});

test("returning from a cancelled goal keeps the current season version", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  const carryForward = `Preserve the opening ${randomUUID().slice(0, 6)}`;
  const openingUrl = await enterSeasonOpeningStageTwo(page, carryForward);
  const conflicts: number[] = [];
  page.on("response", (response) => {
    if (
      new URL(response.url()).pathname === "/api/direction/commands" &&
      response.status() === 409
    )
      conflicts.push(response.status());
  });
  const createGoal = page.getByRole("button", { name: "Create a new goal" });

  await createGoal.click();
  await expect(
    page.getByRole("heading", { name: "Name the outcome." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(createGoal).toBeEnabled();

  await createGoal.click();
  await expect(
    page.getByRole("heading", { name: "Name the outcome." }),
  ).toBeVisible();
  await page.waitForTimeout(1_600);
  await page.goBack();
  await expect(createGoal).toBeEnabled();
  await expect(page.locator(".season-form-error")).toHaveCount(0);

  await createGoal.click();
  await expect(
    page.getByRole("heading", { name: "Name the outcome." }),
  ).toBeVisible();
  const saved = (await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return response.json();
  }, seasonApiFromOpeningUrl(openingUrl))) as {
    answers: { carryForward: string };
  };
  expect(saved.answers.carryForward).toBe(carryForward);
  expect(conflicts).toEqual([]);
});

test("a real season conflict compares values and waits for an explicit retry", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "One two-tab conflict is sufficient.",
  );
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  const openingUrl = await enterSeasonOpeningStageTwo(page);
  const seasonApi = seasonApiFromOpeningUrl(openingUrl);
  const backSave = waitForSeasonDraftSave(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await backSave;
  await expect(
    page.getByRole("textbox", { name: "Carry forward" }),
  ).toBeVisible();
  await page.waitForTimeout(1_100);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  const other = await page.context().newPage();
  const firstReview = waitForSeasonReview(other, seasonApi);
  await other.goto(openingUrl);
  await firstReview;
  await expect(other.locator(".season-opening form")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const otherCarryForward = other.getByRole("textbox", {
    name: "Carry forward",
  });
  await expect(otherCarryForward).toBeEnabled();
  const savedElsewhere = `Saved in the other tab ${randomUUID().slice(0, 6)}`;
  await otherCarryForward.fill(savedElsewhere);
  await expect(otherCarryForward).toHaveValue(savedElsewhere);
  const firstExternalSave = waitForSeasonDraftSave(other, savedElsewhere);
  await other.getByRole("button", { name: "Continue", exact: true }).click();
  await firstExternalSave;
  await expect(
    other.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();

  const localEntry = `Keep this local entry ${randomUUID().slice(0, 6)}`;
  await page.getByRole("textbox", { name: "Carry forward" }).fill(localEntry);
  const conflict = page.locator(".season-form-error");
  await expect(conflict).toContainText("record changed");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("unsaved changes");
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "Leave for now" }).click();
  await expect(page).toHaveURL(openingUrl);

  await conflict
    .getByRole("button", { name: "Review the current saved version" })
    .click();
  const review = page.getByRole("region", {
    name: "Your entries and the saved season differ.",
  });
  await expect(review).toContainText(localEntry);
  await expect(review).toContainText(savedElsewhere);
  await expect(
    review.getByRole("button", { name: "Load saved version" }),
  ).toBeVisible();
  await review.getByRole("button", { name: "Keep my entries" }).click();

  await page.waitForTimeout(1_100);
  const beforeRetry = (await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return response.json();
  }, seasonApi)) as { answers: { carryForward: string } };
  expect(beforeRetry.answers.carryForward).toBe(savedElsewhere);

  const localRetrySave = waitForSeasonDraftSave(page, localEntry);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await localRetrySave;
  await expect(
    page.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();
  const afterRetry = (await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return response.json();
  }, seasonApi)) as { answers: { carryForward: string } };
  expect(afterRetry.answers.carryForward).toBe(localEntry);

  const secondBackSave = waitForSeasonDraftSave(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await secondBackSave;
  await expect(
    page.getByRole("textbox", { name: "Carry forward" }),
  ).toBeVisible();
  await page.waitForTimeout(1_100);
  const secondSeasonReview = waitForSeasonReview(other, seasonApi);
  await other.goto(openingUrl);
  await secondSeasonReview;
  await expect(other.locator(".season-opening form")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(otherCarryForward).toBeEnabled();
  const loadedSavedEntry = `Load this saved entry ${randomUUID().slice(0, 6)}`;
  await otherCarryForward.fill(loadedSavedEntry);
  await expect(otherCarryForward).toHaveValue(loadedSavedEntry);
  const secondExternalSave = waitForSeasonDraftSave(other, loadedSavedEntry);
  await other.getByRole("button", { name: "Continue", exact: true }).click();
  await secondExternalSave;
  await expect(
    other.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Carry forward" })
    .fill("This pending local edit should not overwrite the loaded version.");
  await page.getByRole("button", { name: /Open the chapter/ }).click();
  await expect(conflict).toContainText("record changed");
  await conflict
    .getByRole("button", { name: "Review the current saved version" })
    .click();
  const secondReview = page.getByRole("region", {
    name: "Your entries and the saved season differ.",
  });
  await secondReview
    .getByRole("button", { name: "Load saved version" })
    .click();
  await expect
    .poll(async () => {
      const serialized = await page
        .locator('input[name="seasonOpeningState"]')
        .inputValue();
      return (
        JSON.parse(serialized) as {
          draft: { answers: { carryForward: string } };
        }
      ).draft.answers.carryForward;
    })
    .toBe(loadedSavedEntry);
  await page.waitForTimeout(1_100);
  const afterLoad = (await page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return response.json();
  }, seasonApi)) as { answers: { carryForward: string } };
  expect(afterLoad.answers.carryForward).toBe(loadedSavedEntry);
  await other.close();
});

test("an uncertain season save replays the same operation before continuing", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "One transport-level season retry is sufficient.",
  );
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  await enterSeasonOpeningStageTwo(page, "Keep this through a lost response.");

  const saves: { expectedVersion: number; operationKey: string }[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname !== "/api/direction/commands") return;
    const body = request.postDataJSON() as {
      type?: string;
      expectedVersion?: number;
      operationKey?: string;
    };
    if (
      body.type === "SAVE_SEASON" &&
      typeof body.expectedVersion === "number" &&
      body.operationKey
    )
      saves.push({
        expectedVersion: body.expectedVersion,
        operationKey: body.operationKey,
      });
  });

  let dropped = false;
  const dropCommittedResponse = async (route: Route) => {
    const body = route.request().postDataJSON() as { type?: string };
    if (!dropped && body.type === "SAVE_SEASON") {
      dropped = true;
      await route.fetch();
      await route.abort("failed");
      return;
    }
    await route.continue();
  };
  await page.route("**/api/direction/commands", dropCommittedResponse);
  const createGoal = page.getByRole("button", { name: "Create a new goal" });
  await createGoal.click();
  await expect(page.locator(".season-form-error")).toContainText(
    /could not save/i,
  );

  await page.unroute("**/api/direction/commands", dropCommittedResponse);
  await createGoal.click();
  await expect(
    page.getByRole("heading", { name: "Name the outcome." }),
  ).toBeVisible();
  expect(saves).toHaveLength(2);
  expect(saves[1]).toEqual(saves[0]);
});

test("a season opens around a canonical goal and keeps failed conclusion edits", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  await page.goto("/direction");
  await page.getByRole("link", { name: "Open your season" }).click();

  await page
    .getByRole("textbox", { name: "Carry forward" })
    .fill("Protect the quiet work that compounds.");
  await page
    .getByRole("textbox", { name: "Leave behind" })
    .fill("Performative urgency.");
  await page
    .getByRole("textbox", { name: "This season would feel meaningful if…" })
    .fill("I finish one body of work with care.");
  await page
    .getByRole("textbox", { name: "Protect" })
    .fill("Sleep and unhurried mornings.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", {
      name: "What matters most alongside everything else?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create a new goal" }).click();
  const goalTitle = `A deliberate body of work ${randomUUID().slice(0, 6)}`;
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill(goalTitle);
  await page
    .getByRole("textbox", { name: "Why this matters — optional" })
    .fill("It turns private practice into something I can stand behind.");
  await page.getByRole("button", { name: "Create goal" }).click();

  const primaryPicker = page.getByRole("combobox", { name: "Main direction" });
  await primaryPicker.fill(goalTitle);
  await page.getByRole("option", { name: new RegExp(goalTitle) }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/direction\/seasons\/\d+\/[1-4]\/opening$/);

  await page
    .getByRole("textbox", { name: "Character", exact: true })
    .fill("Jean-Luc Picard");
  await page
    .getByRole("textbox", { name: "Source work" })
    .fill("Star Trek: The Next Generation");
  await page
    .getByRole("textbox", { name: "What you admire" })
    .fill("Calm decisions under pressure.");
  await page.getByRole("button", { name: "Add a trait" }).click();
  await page.getByRole("textbox", { name: "Trait" }).fill("Deliberate");
  await page
    .getByRole("textbox", { name: "What it means in your life" })
    .fill("Pause long enough to choose the next useful move.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Season title — optional" })
    .fill("The deliberate chapter");
  await page.getByRole("button", { name: "Begin this season" }).click();

  await expect(
    page.getByRole("heading", { name: "Direction for this chapter" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: goalTitle })).toBeVisible();
  await page.goto("/");
  await page.reload();
  await expect(
    page.getByRole("link", {
      name: /Open The deliberate chapter, Season [1-4] \d{4}/,
    }),
  ).toBeVisible();
  await expectStyledHomeSeasonCard(page);

  await page.goto("/direction/goals");
  await page.getByRole("link", { name: new RegExp(goalTitle) }).click();
  await page.getByRole("link", { name: "Edit goal" }).click();
  await page.getByRole("button", { name: "Add evidence definition" }).click();
  await page
    .getByRole("combobox", { name: "Evidence type" })
    .selectOption("CONVERSATIONS");
  await page
    .getByRole("textbox", { name: "Definition label" })
    .fill("One useful conversation");
  await page.getByRole("textbox", { name: "Target conversations" }).fill("1");
  await page
    .getByRole("textbox", { name: "Reason for this revision" })
    .fill("Make the next signal explicit.");
  await page.getByRole("button", { name: "Save changes" }).click();

  await page.getByRole("button", { name: "Conclude", exact: true }).click();
  const outcome = page.getByRole("combobox", { name: "Conclusion" });
  await outcome.selectOption("ACHIEVED");
  const conclusion = page.getByRole("textbox", {
    name: "What is your honest conclusion from the evidence and experience?",
  });
  await conclusion.fill("I completed the outcome despite the empty reading.");
  await page
    .getByRole("button", { name: "Conclude", exact: true })
    .last()
    .click();
  await expect(outcome).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText(/required criteria have not been established/i, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(conclusion).toHaveValue(
    "I completed the outcome despite the empty reading.",
  );
});

test("an outreach-scoped experiment remains explicit and can be repeated", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createDisposableDirectionUser(page);
  await page.goto("/direction/goals/new");
  const goalTitle = `Protocol goal ${randomUUID().slice(0, 6)}`;
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill(goalTitle);
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page).toHaveURL(/\/direction\/goals\/[^/]+$/);
  await page.goto("/direction/experiments/new");
  const title = `Narrow outreach ${randomUUID().slice(0, 6)}`;
  await page.getByRole("textbox", { name: "Experiment name" }).fill(title);
  await page
    .getByRole("textbox", { name: "Question" })
    .fill("Will a smaller cohort lead to useful conversations?");
  await page
    .getByRole("textbox", { name: "Approach" })
    .fill("Send one clear message, then wait for a directly linked response.");
  await page
    .getByRole("textbox", {
      name: "Stopping condition — optional with a target date",
      exact: true,
    })
    .fill("After the selected cohort has had seven days to respond.");
  await page.locator('[name="startOn"]').fill("2025-01-01");
  await page.locator('[name="targetOn"]').fill("2025-01-31");
  await page
    .locator('[name="expectedEvidence"]')
    .fill("A directly linked conversation from the cohort.");
  await page.getByRole("combobox", { name: "Goal this tests" }).fill(goalTitle);
  await page.getByRole("option", { name: new RegExp(goalTitle) }).click();
  await page
    .getByRole("combobox", { name: "Life domains" })
    .fill("Engineering");
  await page.getByRole("option", { name: /Engineering/ }).click();
  await page.getByRole("button", { name: "Add evidence definition" }).click();
  await page
    .getByRole("combobox", { name: "Evidence type" })
    .selectOption("CONVERSATIONS");
  await page
    .getByRole("textbox", { name: "Definition label" })
    .fill("Directly linked responses");
  await page.getByRole("textbox", { name: "Target conversations" }).fill("1");
  const outreachOnly = page.getByRole("checkbox", {
    name: /Only conversations linked to this trial’s selected outreach/,
  });
  await outreachOnly.check();
  await expect(outreachOnly).toBeChecked();
  await page.getByRole("button", { name: "Begin experiment" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page
      .getByRole("region", {
        name: "Evidence preview for Directly linked responses",
      })
      .locator("header strong"),
  ).toContainText("Choose this trial's outreach records");
  await page.getByRole("button", { name: "Conclude", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Conclusion" })
    .selectOption("INCONCLUSIVE");
  await page
    .getByRole("textbox", { name: "Result" })
    .fill("No selected outreach was linked to this first setup pass.");
  await page
    .getByRole("textbox", { name: "What you learned" })
    .fill(
      "The cohort must be selected before the result can answer the question.",
    );
  await page
    .getByRole("textbox", {
      name: "What is your honest conclusion from the evidence and experience?",
    })
    .fill("Preserve this as an intentionally inconclusive attempt.");
  const conclude = page
    .getByRole("button", { name: "Conclude", exact: true })
    .last();
  const repeat = page.getByRole("link", { name: "Repeat this attempt" });
  await conclude.click();

  await expect(repeat).toBeVisible();
  const originalId = new URL(page.url()).pathname.split("/").at(-1)!;
  const readAttempt = async (id: string) => {
    const response = await page.request.get(`/api/direction/experiments/${id}`);
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const original = await readAttempt(originalId);
  await repeat.click();
  await expect(
    page.getByText(new RegExp(`fresh attempt after.*${title}`, "i")),
  ).toBeVisible();

  async function expectFreshProtocol() {
    await expect(page.locator('[name="question"]')).toHaveValue(
      original.question,
    );
    await expect(page.locator('[name="approach"]')).toHaveValue(
      original.approach,
    );
    await expect(page.locator('[name="expectedEvidence"]')).toHaveValue(
      original.expectedEvidence,
    );
    await expect(page.locator('[name="stoppingCondition"]')).toHaveValue(
      original.stoppingCondition,
    );
    await expect(
      page.getByRole("combobox", { name: "Goal this tests" }),
    ).toHaveValue(goalTitle);
    await expect(page.locator('[name="domainIds"]')).toHaveValue(
      original.domainIds[0],
    );
    await expect(page.locator('[name="startOn"]')).not.toHaveValue(
      original.startOn,
    );
    await expect(page.locator('[name="targetOn"]')).toHaveValue("");
    await expect(page.locator('[name="sourceInteractionIds"]')).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Definition label" }),
    ).toHaveCount(0);
  }
  await expectFreshProtocol();
  // Exercise the selector independently of the detail-page repeat link.
  await page.goto("/direction/experiments/new");
  await page
    .getByRole("combobox", { name: "Repeat a concluded attempt" })
    .fill(title);
  await page.getByRole("option", { name: new RegExp(title) }).click();
  await expectFreshProtocol();
  const repeatedTitle = `${title} · attempt 2`;
  await page.locator('[name="title"]').fill(repeatedTitle);
  await page.getByRole("button", { name: "Begin experiment" }).click();
  await expect(
    page.getByRole("heading", { name: repeatedTitle }),
  ).toBeVisible();
  const repeatedId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(repeatedId).not.toBe(originalId);
  const repeated = await readAttempt(repeatedId);
  expect(repeated).toMatchObject({
    repeatedFromId: originalId,
    question: original.question,
    approach: original.approach,
    expectedEvidence: original.expectedEvidence,
    stoppingCondition: original.stoppingCondition,
    goalId: original.goalId,
    domainIds: original.domainIds,
    status: "ACTIVE",
    result: null,
    learning: null,
    outcome: null,
    concludedAt: null,
    conclusionSnapshot: null,
    criteria: [],
    sourceInteractionIds: [],
  });
  expect(repeated.history).toHaveLength(1);
  expect(repeated.history[0].kind).toBe("REPEATED");
  const after = await readAttempt(originalId);
  // Live evaluation timestamps can change on read; persisted history cannot.
  const { evaluation: beforeEvaluation, ...beforeStored } = original;
  const { evaluation: afterEvaluation, ...afterStored } = after;
  expect(afterStored).toEqual(beforeStored);
  expect(afterEvaluation.fingerprint).toBe(beforeEvaluation.fingerprint);
});

test("an uncertain lifecycle response retries the exact saved operation", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "One transport-level retry check is sufficient.",
  );
  test.setTimeout(90_000);
  await createDisposableDirectionUser(page);
  await page.goto("/direction/experiments/new");
  const title = `Retryable pause ${randomUUID().slice(0, 6)}`;
  await page.getByRole("textbox", { name: "Experiment name" }).fill(title);
  await page
    .getByRole("textbox", { name: "Question" })
    .fill("Can an uncertain response recover without duplicating an action?");
  await page
    .getByRole("textbox", { name: "Approach" })
    .fill("Save one bounded attempt, then pause it once.");
  await page
    .getByRole("textbox", {
      name: "Stopping condition — optional with a target date",
      exact: true,
    })
    .fill("After the pause retry is confirmed.");
  await page.getByRole("button", { name: "Begin experiment" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const reason = page.getByRole("textbox", {
    name: "Why are you setting it down for now?",
  });
  await reason.fill("Pause once while preserving the request identity.");

  const dropPauseResponse = async (route: Route) => {
    const body = route.request().postDataJSON() as {
      type?: string;
      action?: string;
    };
    if (body.type === "DIRECTION_LIFECYCLE" && body.action === "PAUSE") {
      await route.fetch();
      await route.abort("failed");
      return;
    }
    await route.continue();
  };
  await page.route("**/api/direction/commands", dropPauseResponse);
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Could not complete this request|could not save/i }),
  ).toBeVisible();
  await expect(reason).toHaveValue(
    "Pause once while preserving the request identity.",
  );

  await page.unroute("**/api/direction/commands", dropPauseResponse);
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
});
