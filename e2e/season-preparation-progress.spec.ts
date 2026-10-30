import { expect, test } from "@playwright/test";

test("approved Focus preserves reading, timing and recovery", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/season-preparation-candidate");
  await expect(
    page.getByRole("heading", { name: "Levi Ackerman" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preparation timing details" }),
  ).toHaveText("About 2–5 min total");
  await expect(page.locator(".living-ink-paragraph").first()).toHaveAttribute(
    "data-complete",
    "true",
  );
  await page.screenshot({
    path: `/tmp/become-preparation-focus-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Previous paragraph" }),
  ).toBeEnabled({ timeout: 10000 });
  await page.getByRole("button", { name: "Previous paragraph" }).click();
  await expect(page.locator(".preparation-prose")).toContainText(
    "A quiet city above the clouds.",
  );
  await page.getByRole("button", { name: "Read draft", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Season draft" }),
  ).toContainText("The voice is spare and direct.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reading room", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".preparation-stage")).toHaveAttribute(
    "data-composition",
    "focus",
  );
  await expect(page.locator(".preparation-reading-label")).toContainText(
    "1 / 3",
    { timeout: 12000 },
  );
  await expect(page.locator(".preparation-prose")).toContainText(
    "A quiet city above the clouds.",
  );
  await page.getByRole("button", { name: "Next paragraph" }).click();
  await expect(page.locator(".preparation-prose")).toContainText(
    "The voice is spare and direct.",
  );
  await page.getByRole("button", { name: "Next paragraph" }).click();
  const paragraphs = page.locator(".preparation-prose .living-ink-paragraph");
  await expect(paragraphs).toHaveCount(1);
  await expect(paragraphs).toContainText("Across seven chapters");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Preview controls" }).click();
  const controls = page.getByRole("dialog", { name: "Preview controls" });
  await expect(
    controls.getByRole("radio", { name: "Arriving text" }),
  ).toBeChecked();
  await controls.getByRole("button", { name: "Connection response" }).click();
  await page.getByRole("menuitemradio", { name: "Interrupted" }).click();
  await expect(controls).toBeVisible();
  await expect(
    controls.getByRole("radio", { name: "Arriving text" }),
  ).toBeChecked();
  await controls.getByRole("switch", { name: "Motion" }).uncheck();
  await expect(
    controls.getByRole("switch", { name: "Motion" }),
  ).not.toBeChecked();
  await page.screenshot({
    path: `/tmp/become-preparation-controls-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await controls
    .getByRole("button", { name: "Close Preview controls" })
    .click();
  await expect(paragraphs).toHaveCount(1);
  await expect(paragraphs).toContainText("Across seven chapters");
  await expect(
    page.getByText("Connection interrupted. Draft saved."),
  ).toBeVisible();
  await page.getByText("Details", { exact: true }).click();
  await expect(
    page.getByText(/The connection ended before the complete draft/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause preparation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume preparation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview controls" }).click();
  await controls.getByRole("button", { name: "Replay arrival" }).click();
  await expect(
    controls.getByRole("button", { name: "Connection response" }),
  ).toHaveText("Normal");
  await expect(
    controls.getByRole("switch", { name: "Motion" }),
  ).not.toBeChecked();
  await controls.getByRole("button", { name: "Connection response" }).click();
  await page.getByRole("menuitemradio", { name: "Slow", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(controls).toHaveCount(0);
  await expect(page.getByText("Taking a little longer…")).toBeVisible();
  await page.getByRole("button", { name: "Save & leave" }).click();
  await expect(
    page.getByRole("heading", { name: "Preview closed." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to preparation" }).click();
  await expect(
    page.getByRole("heading", { name: "Levi Ackerman" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion reveals text immediately and research keeps the screen sparse", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/season-preparation-candidate");
  await expect(page.locator(".living-ink-paragraph").first()).toHaveAttribute(
    "data-complete",
    "true",
  );
  await expect(page.locator(".living-ink-word")).toHaveCount(0);
  await page.getByRole("button", { name: "Preview controls" }).click();
  await page.getByRole("radio", { name: "Research", exact: true }).check();
  await expect(
    page.getByRole("radio", { name: "Research", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Research", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("radio", { name: "Arriving text" }),
  ).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Final checks" })).toBeChecked();
  await page.getByRole("radio", { name: "Research", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "A Season taking shape." }),
  ).toBeVisible();
  await expect(page.locator(".living-ink-paragraph")).toHaveCount(0);
});
