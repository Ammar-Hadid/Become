import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  type Locator,
  type Page,
} from "./utils/browser-test.util";

async function createDisposableContentUser(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `content-e2e-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable content QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-content-password");
  await page.getByTestId("auth-submit").click();
  await expect(page).not.toHaveURL(/\/sign-in$/);
}

function waitForThinkingCommand(page: Page, type: string) {
  return page.waitForResponse((response) => {
    if (
      new URL(response.url()).pathname !== "/api/direction/thinking/commands" ||
      !response.ok()
    )
      return false;
    const body = response.request().postDataJSON() as { type?: string };
    return body.type === type;
  });
}

function waitForContentCommand(page: Page, type: string) {
  return page.waitForResponse((response) => {
    if (
      new URL(response.url()).pathname !== "/api/content/commands" ||
      !response.ok()
    )
      return false;
    const body = response.request().postDataJSON() as { type?: string };
    return body.type === type;
  });
}

async function chooseSelect(scope: Locator, label: string, option: string) {
  await scope.getByRole("button", { name: label }).click();
  await scope
    .getByRole("menu", { name: label })
    .getByRole("menuitemradio", { name: option })
    .click();
}

async function addChannel(
  page: Page,
  dialog: Locator,
  platform: "YOUTUBE" | "TIKTOK" | "INSTAGRAM",
  name: string,
  account: string,
) {
  if (
    !(await dialog
      .getByRole("group", { name: "New channel or account" })
      .isVisible())
  ) {
    await dialog
      .getByRole("button", { name: "Add a channel or account" })
      .click();
  }
  const platformLabel = {
    YOUTUBE: "YouTube",
    TIKTOK: "TikTok",
    INSTAGRAM: "Instagram",
  }[platform];
  await chooseSelect(dialog, "Platform", platformLabel);
  await dialog.getByLabel("Channel name").fill(name);
  await dialog.getByLabel("Account or handle").fill(account);
  await Promise.all([
    waitForContentCommand(page, "SAVE_CHANNEL"),
    dialog.getByRole("button", { name: "Save channel" }).click(),
  ]);
}

async function recordResults(
  page: Page,
  channelText: string,
  values: { views: string; likes: string; comments: string },
) {
  const release = page
    .locator(".content-release-list > li")
    .filter({ hasText: channelText });
  await release.getByRole("button", { name: "Record results" }).click();
  const dialog = page.getByRole("dialog", {
    name: "What does this release show now?",
  });
  await dialog.getByLabel("Views Optional").fill(values.views);
  await dialog.getByLabel("Likes Optional").fill(values.likes);
  await dialog.getByLabel("Comments Optional").fill(values.comments);
  await Promise.all([
    waitForContentCommand(page, "RECORD_OBSERVATION"),
    dialog.getByRole("button", { name: "Record results", exact: true }).click(),
  ]);
  await expect(dialog).not.toBeVisible();
}

test("an idea becomes one version released and measured on three channels", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createDisposableContentUser(page);

  const idea = "Three small openings for a difficult creative habit";
  await page.goto("/direction/ideas");
  await page.getByRole("button", { name: /What might matter later/ }).click();
  await page.getByLabel("Idea", { exact: true }).fill(idea);
  await page
    .getByLabel("Note Optional")
    .fill("Show the first move before explaining the whole system.");
  await Promise.all([
    waitForThinkingCommand(page, "SAVE_IDEA"),
    page.getByRole("button", { name: "Park idea" }).click(),
  ]);

  await page.getByRole("link", { name: new RegExp(idea) }).click();
  await expect(page.getByRole("heading", { name: idea })).toBeVisible();
  await page.getByRole("button", { name: "Create content" }).click();
  const promotion = page.getByRole("dialog", {
    name: "Give this idea a place to become real.",
  });
  await expect(promotion.getByText(/Nothing is created until/)).toBeVisible();
  await chooseSelect(promotion, "First version format", "Short vertical");
  await Promise.all([
    waitForThinkingCommand(page, "PROMOTE_IDEA"),
    promotion
      .getByRole("button", { name: "Create content", exact: true })
      .click(),
  ]);

  await expect(page).toHaveURL(/\/content\/[^/]+$/);
  await expect(page.getByRole("heading", { name: idea })).toBeVisible();
  await page
    .getByLabel("Hook")
    .fill("You do not need a content calendar. You need a smaller first move.");
  await page
    .getByLabel("Outline / talking points")
    .fill(
      "Open the note. Pick one claim. Record the useful version. Release it.",
    );
  await waitForContentCommand(page, "SAVE_WRITING");

  await chooseSelect(
    page.locator(".content-progress"),
    "Production stage",
    "Write",
  );
  await Promise.all([
    waitForContentCommand(page, "SAVE_VARIANT"),
    page.getByRole("button", { name: "Save progress" }).click(),
  ]);
  await chooseSelect(
    page.locator(".content-progress"),
    "Focus activity",
    "Scripting",
  );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/sessions" &&
        response.status() === 201,
    ),
    page.getByRole("button", { name: "Start focus" }).click(),
  ]);
  await expect(
    page.getByRole("button", { name: "Complete active session" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete active session" }).click();
  await page.getByTestId("session-outcome").fill("Finished the short script.");
  await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith("/complete"),
    ),
    page.getByTestId("confirm-stop-timer").click(),
  ]);

  await page.getByRole("button", { name: "Record a release" }).click();
  const releaseDialog = page.getByRole("dialog", { name: "Where did it go?" });
  await addChannel(page, releaseDialog, "YOUTUBE", "Shorts", "@become-qa");
  await addChannel(page, releaseDialog, "TIKTOK", "TikTok", "@become-qa");
  await addChannel(page, releaseDialog, "INSTAGRAM", "Reels", "@become-qa");
  await expect(
    releaseDialog.getByRole("button", { name: "Record 3 releases" }),
  ).toBeEnabled();
  await Promise.all([
    waitForContentCommand(page, "PUBLISH"),
    releaseDialog.getByRole("button", { name: "Record 3 releases" }).click(),
  ]);
  await expect(page.locator(".content-release-list > li")).toHaveCount(3);

  await recordResults(page, "YouTube", {
    views: "1200",
    likes: "81",
    comments: "12",
  });
  await recordResults(page, "TikTok", {
    views: "2300",
    likes: "144",
    comments: "19",
  });
  await recordResults(page, "Instagram", {
    views: "950",
    likes: "72",
    comments: "8",
  });

  await expect(
    page.locator(".content-release-list > li").filter({ hasText: "YouTube" }),
  ).toContainText("1,200");
  await expect(
    page.locator(".content-release-list > li").filter({ hasText: "TikTok" }),
  ).toContainText("2,300");
  await expect(
    page.locator(".content-release-list > li").filter({ hasText: "Instagram" }),
  ).toContainText("950");

  await page.goto("/direction/ideas");
  await page.getByRole("link", { name: new RegExp(idea) }).click();
  await expect(
    page.getByRole("heading", { name: "Inspired 1 thing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(idea) }),
  ).toBeVisible();
});
