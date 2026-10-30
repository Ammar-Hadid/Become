import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test("currency menus support keyboard selection, saving, reset, and optional filters", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Currency tester");
  await page
    .getByTestId("email-input")
    .fill(`currency-${randomUUID()}@example.test`);
  await page.getByTestId("password-input").fill("currency-test-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/finance/accounts");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const trigger = dialog.getByRole("button", { name: "Currency", exact: true });
  await expect(trigger).toContainText("EUR · Euro");
  await expect(
    dialog.getByRole("textbox", { name: "Currency", exact: true }),
  ).toHaveCount(0);
  await trigger.press("ArrowDown");
  const menu = dialog.getByRole("menu", { name: "Currency", exact: true });
  await expect(menu.getByRole("menuitemradio")).toHaveText([
    "EUR · Euro",
    "USD · US dollar",
    "GBP · British pound",
    "CAD · Canadian dollar",
    "JPY · Japanese yen",
  ]);
  await expect(menu.getByRole("menuitemradio", { checked: true })).toHaveText(
    "EUR · Euro",
  );
  await expect(menu.getByRole("menuitemradio").first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitemradio").last()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("JPY · Japanese yen");
  await expect(dialog.locator('select[name="currency"]')).toHaveValue("JPY");
  await trigger.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await dialog.getByLabel("Account name").fill("Yen account");
  await dialog.getByLabel("Current balance").fill("1000");
  await dialog
    .getByRole("button", { name: "Create account & reconcile", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Yen account/ })).toContainText(
    "JPY",
  );
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(trigger).toContainText("EUR · Euro");
  await page.keyboard.press("Escape");
  await page.goto("/finance/transactions");
  const filter = page.getByRole("button", { name: "Currency", exact: true });
  await filter.click();
  await page
    .getByRole("menuitemradio", { name: "CAD · Canadian dollar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/currency=CAD/);
  await expect(filter).toContainText("CAD · Canadian dollar");
  await filter.click();
  await page
    .getByRole("menuitemradio", { name: "Any currency", exact: true })
    .click();
  await expect(page.locator('select[name="currency"]')).toHaveValue("");
});
