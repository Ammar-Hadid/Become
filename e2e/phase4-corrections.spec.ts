import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import {
  test,
  expect as playwrightExpect,
  type Page,
} from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
const expect = playwrightExpect.configure({ timeout: 15_000 });
test.setTimeout(120_000);

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `phase4-corrections-${randomUUID()}@example.com`;
  await page
    .getByTestId("name-input")
    .fill("Disposable acceptance corrections");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("disposable-acceptance-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}
test("dirty form selection does not request discard; actual dismissal does", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  const summary = page.getByRole("textbox", { name: "Summary", exact: true });
  await summary.fill("Keep these notes");
  const prompts: string[] = [];
  page.on("dialog", async (d) => {
    prompts.push(d.message());
    await d.dismiss();
  });
  const box = (await summary.boundingBox())!;
  const dialog = page.getByRole("dialog", {
    name: "Log interaction",
    exact: true,
  });
  const bounds = (await dialog.boundingBox())!;
  // Native click retargeting uses the common ancestor when a selection leaves the panel.
  await page.mouse.move(box.x + box.width - 20, box.y + box.height - 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x - 12, box.y + box.height - 10, { steps: 10 });
  await page.mouse.up();
  await summary.selectText();
  await summary.click({ position: { x: box.width - 20, y: box.height - 12 } });
  await expect(dialog).toBeVisible();
  expect(prompts).toEqual([]);
  await page.keyboard.press("Escape");
  await expect.poll(() => prompts.length).toBe(1);
  await expect(dialog).toBeVisible();
});

test("company and accepted offer connect existing work and explicitly attribute the same Finance receipt", async ({
  page,
}, info) => {
  const userId = await signUp(page);
  const company = await prisma.company.create({
    data: {
      userId,
      name: "Acceptance Company",
      normalizedName: "acceptance company",
    },
  });
  const existing = await prisma.workSource.create({
    data: {
      userId,
      name: "Existing client source",
      type: "CLIENT",
      defaultCompensationType: "UNKNOWN",
    },
  });
  await prisma.financialAccount.create({
    data: {
      userId,
      name: "Disposable receipt account",
      currency: "EUR",
      type: "CHECKING",
    },
  });
  const offer = await prisma.offer.create({
    data: { userId, companyId: company.id },
  });
  const common = {
    userId,
    offerId: offer.id,
    companyId: company.id,
    companySnapshot: company.name,
    title: "Monthly support",
    scope: "One monthly check-in",
    currency: "EUR",
    priceBasis: "RECURRING",
    intervalUnit: "MONTH",
    intervalCount: 1,
  };
  const accepted = await prisma.offerRevision.create({
    data: {
      ...common,
      version: 1,
      priceMinor: 15000n,
      proposedAt: new Date("2026-09-01"),
    },
  });
  await prisma.offerRevision.create({
    data: { ...common, version: 2, priceMinor: 17500n },
  });
  const engagement = await prisma.offerEngagement.create({
    data: {
      userId,
      offerId: offer.id,
      companyId: company.id,
      companySnapshot: company.name,
      identityKind: "BUSINESS",
    },
  });
  await prisma.offerEvent.create({
    data: {
      userId,
      offerId: offer.id,
      offerRevisionId: accepted.id,
      engagementId: engagement.id,
      kind: "PROPOSED",
      occurredAt: new Date("2026-09-01"),
      sourceDescription: "Actual proposed terms",
    },
  });
  await page.goto(`/entrepreneurship/market/companies/${company.id}`);
  await page
    .getByRole("button", { name: "Create / Link WorkSource", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm WorkSource connection" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => prisma.companyWorkSource.count({ where: { userId } }))
    .toBe(1);
  await page
    .getByRole("button", { name: "Create / Link WorkSource", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "WorkSource action" })
    .selectOption("LINK");
  await page
    .getByRole("combobox", { name: "Existing WorkSource", exact: true })
    .selectOption(existing.id);
  await page
    .getByRole("button", { name: "Confirm WorkSource connection" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => prisma.companyWorkSource.count({ where: { userId } }))
    .toBe(2);
  await page.goto(`/entrepreneurship/offers/${offer.id}`);
  await page.getByRole("button", { name: "Revise terms", exact: true }).click();
  const currency = page.getByRole("button", { name: "Currency", exact: true });
  await currency.click();
  const currencies = page.getByRole("menu", { name: "Currency", exact: true });
  await expect(currencies.getByRole("menuitemradio")).toHaveCount(5);
  await currencies
    .getByRole("menuitemradio", { name: "CAD · Canadian dollar", exact: true })
    .click();
  await expect(page.locator('select[name="currency"]')).toHaveValue("CAD");
  await expect(currency).toBeFocused();
  await currency.press("ArrowDown");
  await page
    .getByRole("menuitemradio", { name: "EUR · Euro", exact: true })
    .press("Enter");
  await expect(page.locator('select[name="currency"]')).toHaveValue("EUR");
  await page
    .getByRole("button", { name: "Close Create a new revision" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Record outcome", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Quoted revision" })
    .selectOption(accepted.id);
  await page
    .getByRole("combobox", { name: "Event", exact: true })
    .selectOption("ACCEPTED");
  await page
    .getByRole("textbox", { name: "Source or reason" })
    .fill("Customer explicitly accepted the EUR 150 revision by phone.");
  await page
    .getByRole("button", { name: "Add observation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Statement or behavior" })
    .fill("We would like to start next month.");
  await page
    .getByRole("button", { name: "Record outcome", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".business-offer-quote")).toContainText(
    "Accepted terms",
  );
  await expect(page.locator(".business-offer-quote")).toContainText(
    "EUR 150.00 every 1 month",
  );
  await expect(page.locator(".business-offer-quote")).not.toContainText("175");
  await expect(
    page.getByRole("button", { name: "Choose how to continue" }),
  ).toBeVisible();
  await page.getByText("Earlier quoted terms · 1", { exact: true }).click();
  await expect(
    page
      .locator(".business-revision-value--previous")
      .getByText("EUR 150.00 every 1 month", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".business-revision-value--revised")
      .getByText("EUR 175.00 every 1 month", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("accepted-offer.png"),
    fullPage: true,
  });
  expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
    0,
  );
  await page.getByRole("button", { name: "Choose how to continue" }).click();
  await page.getByRole("button", { name: "Save choice" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } }))
          .continuationChoice,
    )
    .toBe("NOT_NOW");
  await page.getByRole("link", { name: "Record receipt in Finance ↗" }).click();
  await expect(
    page.getByText(/Recording a receipt for Acceptance Company/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Amount (EUR)", exact: true })
    .fill("150");
  await page
    .getByRole("button", { name: "Record transaction", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Return to attribute receipt ↗", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Attribute existing receipt" })
    .click();
  const receipt = await prisma.financialTransaction.findFirstOrThrow({
    where: { userId },
  });
  await page
    .getByRole("combobox", { name: "Finance receipt", exact: true })
    .selectOption(receipt.id);
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "EUR 150.00 remaining",
  );
  await expect(
    page.getByRole("combobox", { name: "Recipient's offer terms" }),
  ).toHaveValue(accepted.id);
  await page.getByRole("button", { name: "Confirm attribution" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const attributedReceipt = page
    .getByRole("article")
    .filter({ hasText: "EUR 150.00 · Received" });
  await expect(attributedReceipt).toContainText("Monthly support · revision 1");
  expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
    1,
  );
  const allocation = await prisma.businessReceiptAllocation.findFirstOrThrow({
    where: { userId },
  });
  expect(allocation).toMatchObject({
    transactionId: receipt.id,
    offerRevisionId: accepted.id,
    amountMinor: 15000n,
  });
  await page.getByRole("link", { name: "View the Finance receipt ↗" }).click();
  await expect(page.getByText("EUR 150.00 attributed")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("receipt.png"),
    fullPage: true,
  });
});

test("multiple complete observations retain stable errors, participant roles and source inspection drafts", async ({
  page,
}) => {
  const userId = await signUp(page);
  const company = await prisma.company.create({
    data: {
      userId,
      name: "Observation Company",
      normalizedName: "observation company",
    },
  });
  const problem = await prisma.problem.create({
    data: {
      userId,
      title: "Repetitive phone calls",
      initialStatement: "Calls may interrupt work",
      origin: "USER_HYPOTHESIS",
    },
  });
  await page.goto(`/entrepreneurship/market/companies/${company.id}`);
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Discussed interruptions with two participants.");
  await page
    .getByText("Context, participants & notes", { exact: true })
    .click();
  for (const [i, name] of ["Alex", "Sam"].entries()) {
    await page
      .getByRole("button", { name: "Add participant", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .nth(i)
      .fill(name);
    await page
      .getByRole("textbox", { name: "Role", exact: true })
      .nth(i)
      .fill(i ? "Owner" : "Operations");
  }
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Add observation", exact: true })
      .click();
    const entry = page.locator("[data-entry]").nth(i);
    await entry
      .getByRole("textbox", { name: "Statement or behavior" })
      .fill(`Explicit statement ${i + 1}`);
    await entry
      .getByRole("combobox", { name: "Related problem · optional" })
      .selectOption(problem.id);
    await entry
      .getByRole("combobox", { name: "Relationship to problem" })
      .selectOption(["SUPPORTS", "CONTRADICTS", "CONTEXT"][i]);
    if (i !== 1)
      await entry
        .getByRole("textbox", { name: "Your interpretation" })
        .fill("This relates to this company only.");
  }
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Observation 2: explain how this statement relates to “Repetitive phone calls”",
  );
  expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
  await page
    .locator("[data-entry]")
    .nth(1)
    .getByRole("button", { name: "Move observation up", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Observation 1:",
  );
  await page
    .locator("[data-entry]")
    .nth(0)
    .getByRole("textbox", { name: "Your interpretation" })
    .fill("This contradicts the claim for this company.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Alex (Operations), Sam (Owner)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Observations · 3" }),
  ).toBeVisible();
  const menu = page.getByRole("button", {
    name: "Interaction actions",
    exact: true,
  });
  await menu.click();
  const anchor = (await menu.boundingBox())!;
  const popup = (await page
    .getByRole("menu", { name: "Interaction actions" })
    .boundingBox())!;
  expect(
    Math.abs(popup.x + popup.width - anchor.x - anchor.width),
  ).toBeLessThan(20);
  await page.keyboard.press("Escape");
  await page.goto(`/entrepreneurship/problems/${problem.id}`);
  await expect(
    page.getByText(
      "3 current source links. Each source keeps its audience, attribution, and interpretation.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("1 supporting source links", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 contradicting source links", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 businesses", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Record assessment" }).click();
  await page
    .getByRole("textbox", { name: "Scope of this judgment" })
    .fill("Keep this draft while inspecting.");
  const [popupPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Show observation ↗" }).first().click(),
  ]);
  await expect(
    popupPage.getByText("Recorded source words · revision 1"),
  ).toBeVisible();
  await popupPage.close();
  await expect(
    page.getByRole("textbox", { name: "Scope of this judgment" }),
  ).toHaveValue("Keep this draft while inspecting.");
});

test("plain live company search, independent archives, period and recipient overrides preserve place", async ({
  page,
}) => {
  const userId = await signUp(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prisma.company.createMany({
    data: Array.from({ length: 112 }, (_, i) => ({
      userId,
      name: `Company ${String(i).padStart(3, "0")}`,
      normalizedName: `company ${String(i).padStart(3, "0")}`,
    })),
  });
  await prisma.company.create({
    data: {
      userId,
      name: "Archived Company",
      normalizedName: "archived company",
      archivedAt: new Date(),
    },
  });
  await prisma.niche.createMany({
    data: Array.from({ length: 9 }, (_, i) => ({
      userId,
      name: `Active niche ${i}`,
      normalizedName: `active niche ${i}`,
      scope: "A scope to keep the company section further down the page.",
    })),
  });
  await prisma.niche.create({
    data: {
      userId,
      name: "Archived niche",
      normalizedName: "archived niche",
      archivedAt: new Date(),
    },
  });
  await page.goto("/entrepreneurship/market?companies=legacy-selection");
  await expect(page.locator(".business-company-row")).toHaveCount(25);
  const search = page.getByRole("searchbox", {
    name: "Search companies",
    exact: true,
  });
  await search.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await search.fill("Company 111");
  await expect(page.locator(".business-company-list")).toContainText(
    "Company 111",
  );
  await expect(page.locator(".business-company-row")).toHaveCount(1);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove Company 111" }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/companies=/);
  // Filtering to one row can shorten the page below the previous scroll offset.
  const scroll = await page.evaluate(() => ({
    actual: scrollY,
    maximum: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(
    Math.abs(scroll.actual - Math.min(before, scroll.maximum)),
  ).toBeLessThan(120);
  await search.fill("");
  await expect(page.locator(".business-company-row")).toHaveCount(25);
  await page.getByRole("link", { name: "View archived businesses" }).click();
  await expect(page.locator(".business-company-list")).toContainText(
    "Archived Company",
  );
  await page.getByText("Browse explorations", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Active niche 0/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Archived niche/ })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "View archived explorations" }).click();
  await expect(page.locator(".business-company-list")).toContainText(
    "Archived Company",
  );
  await expect(
    page.getByRole("link", { name: /Archived niche/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Active businesses", exact: true })
    .click();
  await page.route("**/entrepreneurship/market**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).searchParams.get("q") === "Company 01"
    )
      await new Promise((r) => setTimeout(r, 650));
    await route.continue();
  });
  await search.fill("Company 01");
  await page.waitForTimeout(220);
  await search.fill("Company 111");
  await expect(page.locator(".business-company-list")).toContainText(
    "Company 111",
  );
  await expect(page.locator(".business-company-row")).toHaveCount(1);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.waitForTimeout(750);
  await expect(page.locator(".business-company-list")).toContainText(
    "Company 111",
  );
  await expect(page.locator(".business-company-row")).toHaveCount(1);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.unroute("**/entrepreneurship/market**");
  await page.goto("/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Record batch outreach", exact: true })
    .click();
  const recipients = page.getByRole("button", {
    name: /^Business recipients /,
  });
  await recipients.click();
  const recipientSearch = page.getByRole("searchbox", {
    name: "Search business recipients",
    exact: true,
  });
  for (const name of ["Company 000", "Company 111"]) {
    await recipientSearch.fill(name);
    await page
      .getByRole("menuitemcheckbox", { name: new RegExp(`^${name}`) })
      .click();
  }
  await page.keyboard.press("Escape");
  await expect(recipients).toHaveAccessibleName(
    "Business recipients 2 records selected",
  );
  await page
    .getByRole("textbox", { name: "Shared summary", exact: true })
    .fill("Sent shared introduction");
  await page
    .getByRole("textbox", { name: "Shared notes · optional" })
    .fill("Shared source context");
  await page.getByText("Customize Company 111", { exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Override summary for Company 111" })
    .check();
  await page.getByRole("textbox", { name: "Company 111 · Summary" }).fill("");
  await page.getByRole("checkbox", { name: /I actually sent/ }).check();
  await page
    .getByRole("button", { name: "Record sent outreach", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Recipient Company 111 · summary",
  );
  expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
  await page
    .getByRole("textbox", { name: "Company 111 · Summary" })
    .fill("Sent an individual introduction");
  // Lose the response after the server commits, then retry the same capture key.
  await page.route("**/entrepreneurship/interactions", async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Record sent outreach", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("alert")
      .filter({ hasText: "Could not save" }),
  ).toBeVisible();
  await page.unroute("**/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Record sent outreach", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const records = await prisma.interactionRevision.findMany({
    where: { userId },
  });
  expect(records).toHaveLength(2);
  expect(records.map((r) => r.summary).sort()).toEqual(
    ["Sent an individual introduction", "Sent shared introduction"].sort(),
  );
  await page.goto("/entrepreneurship/history");
  const period = page.getByRole("combobox", { name: "Timeframe", exact: true });
  await period.scrollIntoViewIfNeeded();
  const periodY = await page.evaluate(() => scrollY);
  await period.selectOption("month");
  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(/timeframe=month/);
  expect(Math.abs((await page.evaluate(() => scrollY)) - periodY)).toBeLessThan(
    120,
  );
});

test("completed-session capture uses the page width and preserves notes through a failed save", async ({
  page,
}, info) => {
  const userId = await signUp(page);
  const domain = await prisma.domain.findFirstOrThrow({
    where: { userId, slug: "entrepreneurship" },
    include: { activityTypes: true },
  });
  const session = await prisma.session.create({
    data: {
      userId,
      domainId: domain.id,
      activityTypeId: domain.activityTypes[0].id,
      startedAt: new Date("2026-09-01T09:00:00Z"),
      endedAt: new Date("2026-09-01T09:30:00Z"),
      outcome: "Reviewed actual customer notes",
    },
  });
  await page.goto(`/entrepreneurship?session=${session.id}`);
  await page
    .getByRole("link", { name: "Log an interaction from this session →" })
    .click();
  await expect(page).toHaveURL(
    `/entrepreneurship/interactions/capture?session=${session.id}`,
  );
  await expect(page.getByTestId("session-details-backdrop")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("session-details-backdrop")).toHaveCount(0);
  await expect(
    page.getByText("The session is already saved", { exact: true }),
  ).toBeVisible();
  const form = page.locator("form").filter({
    has: page.getByRole("button", {
      name: "Save actual interaction",
      exact: true,
    }),
  });
  const bounds = (await page.locator(".business-form-surface").boundingBox())!;
  await expect(form).toBeVisible();
  const heading = (await page
    .locator(".business-section-heading")
    .boundingBox())!;
  expect(bounds.width).toBeGreaterThan(heading.width * 0.95);
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Only notes about an actual conversation.");
  await page.screenshot({
    path: info.outputPath("session-capture.png"),
    fullPage: true,
  });
  await page.route(
    "**/entrepreneurship/interactions/capture**",
    async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    },
  );
  await page
    .getByRole("button", { name: "Save actual interaction", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not save" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Summary", exact: true }),
  ).toHaveValue("Only notes about an actual conversation.");
  await page.unroute("**/entrepreneurship/interactions/capture**");
  await page
    .getByRole("button", { name: "Save actual interaction", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/entrepreneurship\/interactions\/(?!capture)[^/]+$/,
  );
  expect(
    await prisma.interactionRevision.count({
      where: { userId, sourceSessionId: session.id },
    }),
  ).toBe(1);
  expect(await prisma.observation.count({ where: { userId } })).toBe(0);
});
