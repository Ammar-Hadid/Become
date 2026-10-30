import { expect, test } from "@playwright/test";
const route = "/copy-button-success-candidate";

test("confirmed copy turns green, swaps the icon and preserves geometry and keyboard focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          sessionStorage.setItem("copied-preview-text", text);
        },
      },
    }),
  );
  await page.goto(route);
  await expect(page).toHaveTitle("Copy button success preview · Become");
  const button = page.locator(".copy-feedback-button");
  await button.focus();
  const before = await button.boundingBox();
  await button.press("Enter");
  await expect(button).toHaveAttribute("data-feedback", "success");
  await expect(button).toHaveAttribute("aria-label", "Copied");
  await expect(button).toHaveCSS("background-color", "rgb(84, 184, 139)");
  await expect(button.locator(".become-button-feedback-check")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(button.locator(".become-button-feedback-original")).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(button).toBeFocused();
  expect(await button.boundingBox()).toEqual(before);
  const value = await page
    .getByRole("textbox", { name: "Sample image prompt", exact: true })
    .inputValue();
  expect(
    await page.evaluate(() => sessionStorage.getItem("copied-preview-text")),
  ).toBe(value);
  await expect(page.getByRole("status")).toHaveText(
    "Prompt copied to clipboard.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("repeated success restarts the two-second confirmation and reduced motion keeps state immediate", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    }),
  );
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const button = page.locator(".copy-feedback-button");
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "success");
  await expect(button).toHaveCSS("transition-duration", "0s");
  await page.clock.runFor(1500);
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "success");
  await page.clock.runFor(1000);
  await expect(button).toHaveAttribute("data-feedback", "success");
  await page.clock.runFor(1001);
  await expect(button).toHaveAttribute("data-feedback", "idle");
  await expect(button).toHaveAttribute("aria-label", "Copy prompt");
});

test("clipboard rejection clears prior success and retries; unavailable clipboard never signals copied", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    }),
  );
  await page.goto(route);
  const button = page.locator(".copy-feedback-button");
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "success");
  await page.getByText("Preview controls", { exact: true }).click();
  await page
    .getByRole("button", { name: "Fail next copy", exact: true })
    .click();
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "idle");
  await expect(page.getByRole("status")).toContainText("Copy failed");
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "success");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "idle");
  await expect(page.getByRole("status")).toContainText("Select and copy");
});

test("duplicate pending clicks and changed text cannot produce stale success", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          sessionStorage.setItem(
            "copy-call-count",
            String(Number(sessionStorage.getItem("copy-call-count") ?? 0) + 1),
          );
          await new Promise((resolve) => setTimeout(resolve, 600));
        },
      },
    }),
  );
  await page.goto(route);
  const button = page.locator(".copy-feedback-button");
  await button.evaluate((element) => {
    if (element instanceof HTMLButtonElement) {
      element.click();
      element.click();
    }
  });
  await expect(button).toHaveAttribute("data-feedback", "pending");
  expect(
    await page.evaluate(() => sessionStorage.getItem("copy-call-count")),
  ).toBe("1");
  await page
    .getByRole("textbox", { name: "Sample image prompt", exact: true })
    .fill("A changed prompt.");
  await expect(button).toHaveAttribute("data-feedback", "idle");
  await page.waitForTimeout(650);
  await expect(button).toHaveAttribute("data-feedback", "idle");
  await button.click();
  await expect(button).toHaveAttribute("data-feedback", "success");
});
