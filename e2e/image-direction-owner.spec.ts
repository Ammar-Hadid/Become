import { test, expect } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test("a delayed image-direction save preserves newer intent and prompt edits", async ({ page }) => {
  const email = process.env.BECOME_OWNER_EMAIL ?? "";
  test.skip(!email.endsWith("@example.test"), "Requires a disposable owner and matching local server.");
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByTestId("name-input").fill("Image Direction draft recovery");
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("disposable-image-owner-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/settings/image-direction");
  const workspace = page.getByRole("region", { name: "Image Prompts workspace", exact: true });
  await workspace.getByRole("button", { name: "Edit intent", exact: true }).click();
  await workspace.getByRole("button", { name: "Edit prompt body", exact: true }).click();
  const intent = workspace.getByRole("textbox", { name: "What this imagery type should achieve", exact: true });
  const prompt = workspace.getByRole("textbox", { name: /prompt body$/ });
  await intent.fill("The first submitted intent.");
  await prompt.fill("The first submitted prompt preserves the source-grounded character in a calm setting.");
  let release!: () => void;
  let saved!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const acknowledged = new Promise<void>((resolve) => { saved = resolve; });
  await page.route("**/api/settings/image-direction", async (route) => {
    const response = await route.fetch();
    saved();
    await held;
    await route.fulfill({ response });
  });
  try {
    await workspace.getByRole("button", { name: "Save as draft", exact: true }).click();
    await acknowledged;
    await intent.fill("Newer intent typed while the save response is pending.");
    await prompt.fill("Newer prompt typed while the save response is pending must remain available for the next save.");
    release();
    await expect(workspace.getByText("Draft v2", { exact: true })).toBeVisible();
    await expect(intent).toHaveValue("Newer intent typed while the save response is pending.");
    await expect(prompt).toContainText("Newer prompt typed while the save response is pending must remain available for the next save.");
    await expect(workspace.getByRole("button", { name: "Publish saved draft", exact: true })).toHaveCount(0);
    await workspace.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(workspace.getByText("Draft v3", { exact: true })).toBeVisible();
    await page.reload();
    await expect(workspace).toContainText("Newer intent typed while the save response is pending.");
    await expect(workspace).toContainText("Newer prompt typed while the save response is pending must remain available for the next save.");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("the owner can save and publish image directions, with recoverable interrupted edits", async ({
  page,
}) => {
  const email = process.env.BECOME_OWNER_EMAIL ?? "";
  test.skip(
    !email.endsWith("@example.test"),
    "Requires an explicitly configured disposable owner and matching local server.",
  );
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable Image Direction owner");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("disposable-image-owner-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/settings/image-direction");
  const workspace = page.getByRole("region", {
    name: "Image Prompts workspace",
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await workspace
    .getByRole("button", { name: "Edit intent", exact: true })
    .click();
  const intent = page.getByRole("textbox", {
    name: "What this imagery type should achieve",
    exact: true,
  });
  await intent.fill("  A calm, source-grounded setting for this Season.  ");
  await workspace
    .getByRole("button", { name: "Save as draft", exact: true })
    .click();
  await expect(workspace.getByText("Draft v2", { exact: true })).toBeVisible();
  await expect(workspace.getByText("A calm, source-grounded setting for this Season.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    workspace.getByText("A calm, source-grounded setting for this Season.", {
      exact: true,
    }),
  ).toBeVisible();
  await workspace
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  await expect(
    workspace.getByText("Published v2", { exact: true }),
  ).toBeVisible();
  await expect(
    workspace.getByRole("button", { name: "Publish saved draft", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await workspace
    .getByRole("button", { name: "Edit intent", exact: true })
    .click();
  await intent.fill("Keep this unfinished direction after a network timeout.");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/settings/image-direction", async (route) => {
    await held;
    await route.abort();
  });
  try {
    await workspace
      .getByRole("button", { name: "Save as draft", exact: true })
      .click();
    await expect(workspace.getByRole("alert")).toContainText(
      "Could not confirm the request",
      { timeout: 20_000 },
    );
    await expect(intent).toHaveValue(
      "Keep this unfinished direction after a network timeout.",
    );
    await expect(
      workspace.getByRole("button", { name: "Save as draft", exact: true }),
    ).toBeEnabled();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
