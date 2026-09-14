import { expect, type Page } from "./browser-test.util";

export async function chooseBusinessSource(
  page: Page,
  name: string,
  create = false,
) {
  const identity = page
    .locator("dialog[open] summary")
    .filter({ hasText: "Source identity" });
  if (await identity.count()) await identity.click();
  await page.getByRole("radio", { name: "A business", exact: true }).check();
  await page
    .getByRole("combobox", { name: /^Business(?: — optional)?$/ })
    .fill(name);
  await page
    .getByRole("option", {
      name: create ? "Add “" + name + "” with this record" : name,
      exact: true,
    })
    .click();
}

export async function chooseSpecificBusinessOffer(page: Page, name: string) {
  await page.getByRole("radio", { name: /With someone specific/ }).check();
  await chooseBusinessSource(page, name);
}

export async function openExplorationBusinesses(page: Page) {
  await page
    .getByRole("navigation", { name: "Exploration navigation" })
    .getByRole("link", { name: "Audience", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Audience records" })
    .getByRole("link", { name: "Businesses", exact: true })
    .click();
}

export async function expectExplorationCounts(page: Page, count: number) {
  await expect(
    page.getByRole("link", {
      name: new RegExp("^" + count + " Evidence entries"),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: count + " scoped problems", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: count + " offers", exact: true }),
  ).toBeVisible();
}
