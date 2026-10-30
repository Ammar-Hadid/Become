import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test("record picker close preserves new field focus and nested dialog keyboard behavior", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable picker focus QA");
  await page
    .getByTestId("email-input")
    .fill(`picker-focus-${randomUUID()}@example.test`);
  await page
    .getByTestId("password-input")
    .fill("disposable-picker-focus-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/entrepreneurship/offers");
  await page
    .getByRole("button", { name: "Shape an offer", exact: true })
    .click();
  await page.getByRole("radio", { name: /With someone specific/ }).check();
  await page.getByRole("radio", { name: "A business", exact: true }).check();
  const dialog = page.getByRole("dialog", {
    name: "Shape an offer",
    exact: true,
  });
  const trigger = dialog.getByRole("button", { name: /^Business(?:\s|$)/ });
  const menu = page.getByRole("menu", { name: "Business", exact: true });
  await trigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");

  await trigger.click();
  await menu
    .getByRole("searchbox", { name: "Search business" })
    .fill("Focus Company");
  const option = menu.getByRole("menuitem", { name: /^Use “Focus Company”/ });
  // Model choosing a record and immediately moving to the next field before
  // the menu's deferred focus restoration runs. No arbitrary timing delay.
  const focus = await option.evaluate(async (element) => {
    (element as HTMLButtonElement).click();
    const title = document.querySelector<HTMLInputElement>(
      'dialog[open] input[name="title"]',
    )!;
    title.focus();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return {
      retained: document.activeElement === title,
      active: document.activeElement?.outerHTML,
    };
  });
  expect(
    focus,
    "Closing the record picker must not steal the next field's focus",
  ).toMatchObject({ retained: true });
  await page.keyboard.insertText("A focused offer");
  await expect(
    dialog.getByRole("textbox", { name: "Offer title" }),
  ).toHaveValue("A focused offer");
  await expect(menu).toBeHidden();
  await expect(dialog).toBeVisible();
});
