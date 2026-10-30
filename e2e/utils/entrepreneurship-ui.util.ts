import { expect, type Page } from "./browser-test.util";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function chooseBusinessRecord(
  page: Page,
  label: string,
  name: string,
  { create = false, multiple = false } = {},
) {
  const menu = page.getByRole("menu", { name: label, exact: true });
  if (!(await menu.isVisible()))
    await page
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(label)}(?:\\s|$)`),
      })
      .click();
  await menu
    .getByRole("searchbox", {
      name: `Search ${label.toLowerCase()}`,
      exact: true,
    })
    .fill(name);
  await menu
    .getByRole(
      create ? "menuitem" : multiple ? "menuitemcheckbox" : "menuitemradio",
      {
        name: new RegExp(
          create
            ? `^Use “${escapeRegExp(name)}”`
            : `^${escapeRegExp(name)}(?:\\s|$)`,
        ),
      },
    )
    .click();
}

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
  await chooseBusinessRecord(page, "Business", name, { create });
}

export async function chooseSpecificBusinessOffer(page: Page, name: string) {
  await page.getByRole("radio", { name: /With someone specific/ }).check();
  await chooseBusinessSource(page, name);
}

export async function openExplorationWorkspace(page: Page, label: string) {
  const base = new URL(page.url()).pathname.match(
    /^\/entrepreneurship\/explorations\/[^/]+/,
  )?.[0];
  if (!base)
    throw new Error("Open a saved exploration before choosing a workspace.");
  const closeNavigation = page.getByRole("button", {
    name: "Close navigation",
    exact: true,
  });
  if (await closeNavigation.isVisible()) await closeNavigation.click();
  if (new URL(page.url()).pathname !== `${base}/overview`) {
    await page
      .getByRole("link", { name: "Back to explorations", exact: true })
      .click();
    await page.locator(`a[href="${base}/overview"]`).first().click();
  }
  await expect(page).toHaveURL(`${base}/overview`);
  if (label === "Overview") return;
  if (label === "So Far We Know") {
    await page
      .getByRole("link", { name: "Open understanding", exact: true })
      .click();
    return;
  }
  await page
    .getByRole("navigation", { name: "Workspace shortcuts", exact: true })
    .getByRole("link", { name: new RegExp(`^${escapeRegExp(label)}\\s`) })
    .click();
}

export async function openExplorationBusinesses(page: Page) {
  await openExplorationWorkspace(page, "Audience");
  await page
    .getByRole("navigation", { name: "Audience records" })
    .getByRole("link", { name: "Businesses", exact: true })
    .click();
}

export async function expectExplorationCounts(page: Page, count: number) {
  const shortcuts = page.getByRole("navigation", {
    name: "Workspace shortcuts",
  });
  await expect(
    shortcuts.getByRole("link", {
      name: new RegExp(
        `^Evidence\\s+Trace what changed your view\\s+${count}$`,
      ),
    }),
  ).toBeVisible();
  await expect(
    shortcuts.getByRole("link", {
      name: new RegExp(`^Offers\\s+Test a promise and terms\\s+${count}$`),
    }),
  ).toBeVisible();
  const understanding = page.getByRole("region", { name: "So Far We Know" });
  await expect(
    understanding
      .locator("dt")
      .filter({ hasText: /^Problems$/ })
      .locator("..")
      .locator("dd"),
  ).toHaveText(String(count));
}
