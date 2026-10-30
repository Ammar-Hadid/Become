import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import sharp from "sharp";
import {
  test,
  expect,
  type Locator,
  type Page,
} from "./utils/browser-test.util";

async function createScript(page: Page, baseURL: string) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable script QA");
  await page
    .getByTestId("email-input")
    .fill(`content-script-e2e-${randomUUID()}@example.com`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-script-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  const response = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL },
    data: {
      type: "CREATE_CONTENT",
      operationKey: randomUUID(),
      draft: {
        title: "The first small move",
        purpose: "",
        audience: "",
        notes: "",
      },
      format: "SHORT_VERTICAL",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const data = await response.json();
  const contentId = data.contentId as string;
  const variantId = data.workspace.variants[0].id as string;
  return {
    contentId,
    variantId,
    url: `/content/${contentId}/variants/${variantId}/script`,
  };
}

function scriptSave(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/content/commands") &&
      response.request().postDataJSON()?.type === "SAVE_SCRIPT" &&
      response.ok(),
  );
}

async function expectSquareEditorDialog(dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("border-radius", "0px");
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.left) < 1 && Math.abs(bounds.top) < 1;
      }),
    )
    .toBe(true);
}

test("script links preserve pending writing, save rich text, and return to the exact variant", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  const ids = await createScript(page, baseURL!);
  await page.goto(`/content/${ids.contentId}`);
  await page.getByLabel("Hook", { exact: true }).fill("A smaller first move.");
  await page
    .locator('input[name="title"]')
    .fill("Make room for the first move");
  await page.getByRole("link", { name: "Write script" }).click();
  await expect(page).toHaveURL(new RegExp(`${ids.url}$`));
  await expect(
    page.getByRole("heading", { name: "Make room for the first move" }),
  ).toBeVisible();
  const body = page.getByRole("textbox", { name: "Script body" });
  await body.fill("Start where you are.");
  await body.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(body.locator("strong")).toHaveText("Start where you are.");
  await Promise.all([scriptSave(page), body.press("Control+s")]);
  await page.reload();
  await expect(body.locator("strong")).toHaveText("Start where you are.");
  await page
    .getByRole("button", { name: "Find in script", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Find in script" }).fill("Start");
  await page.getByRole("button", { name: "Show replace" }).click();
  await page.getByRole("textbox", { name: "Replace with" }).fill("Begin");
  await page.getByRole("button", { name: "Replace all", exact: true }).click();
  await page.getByRole("button", { name: "Close find" }).click();
  await expect(body).toContainText("Begin where you are.");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body).toContainText("Start where you are.");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(body).toContainText("Begin where you are.");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("script-editor.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Back to Make room for the first move" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/content/${ids.contentId}\\?variant=${ids.variantId}$`),
  );
  await expect(page.getByRole("link", { name: "Open script" })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Hook", exact: true }),
  ).toHaveValue("A smaller first move.");

  const added = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "CREATE_VARIANT",
      contentId: ids.contentId,
      operationKey: randomUUID(),
      name: "A second take",
      format: "LONG_FORM",
    },
  });
  expect(added.ok()).toBe(true);
  const otherId = (await added.json()).variantId as string;
  await page.goto(`/content/${ids.contentId}?variant=${otherId}`);
  await expect(
    page.getByRole("link", { name: "Write script" }),
  ).toHaveAttribute(
    "href",
    `/content/${ids.contentId}/variants/${otherId}/script`,
  );
  await page.getByRole("link", { name: "Write script" }).click();
  await expect(body).toHaveText("");
});

test("Word import, owned images, tables, and Word export survive a saved round trip", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const ids = await createScript(page, baseURL!);
  await page.goto(ids.url);
  const body = page.getByRole("textbox", { name: "Script body" });
  await expect(body).toBeVisible();
  const file = await Packer.toBuffer(
    new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "An opening worth keeping",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "The useful first sentence.", bold: true }),
              ],
            }),
          ],
        },
      ],
    }),
  );
  await page.locator('input[type="file"][accept^=".docx"]').setInputFiles({
    name: "opening.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: file,
  });
  await expectSquareEditorDialog(
    page.getByRole("dialog", { name: "Document ready." }),
  );
  await page
    .getByRole("dialog", { name: "Document ready." })
    .getByRole("button", { name: "Use document" })
    .click();
  await expect(body.locator("h1")).toHaveText("An opening worth keeping");
  await expect(body.locator("strong")).toHaveText("The useful first sentence.");
  await body.press("ControlOrMeta+End");
  await body.press("Enter");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("menuitem", { name: "2 × 2 table" }).click();
  await expect(body.locator("table")).toBeVisible();
  await body.locator("th").first().click();
  await page.keyboard.type("Beat");
  await body.press("ControlOrMeta+End");
  await body.press("ArrowDown");
  const image = await sharp({
    create: { width: 320, height: 180, channels: 3, background: "#c5a46a" },
  })
    .png()
    .toBuffer();
  await page.locator('input[type="file"][accept^="image/"]').setInputFiles({
    name: "storyboard.png",
    mimeType: "image/png",
    buffer: image,
  });
  const imageDialog = page.getByRole("dialog", {
    name: "Let the image belong to the page.",
  });
  await expectSquareEditorDialog(imageDialog);
  await imageDialog
    .getByLabel("Image description")
    .fill("An amber storyboard frame");
  await imageDialog
    .getByLabel("Caption")
    .fill("A moment before the first move");
  await imageDialog
    .getByRole("button", { name: "Apply image details" })
    .click();
  await expect(
    body.getByRole("img", { name: "An amber storyboard frame" }),
  ).toBeVisible();
  // Autosave may already have confirmed this revision while the image dialog
  // closes. An explicit save of a clean document need not issue another request.
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.locator(".content-script-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await expect(
    body.getByRole("img", { name: "An amber storyboard frame" }),
  ).toBeVisible();
  await expect(body.locator("table")).toContainText("Beat");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Download Word" }).click(),
  ]);
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = await mammoth.convertToHtml({
    buffer: await readFile(path!),
  });
  expect(exported.value).toContain("<h1>An opening worth keeping</h1>");
  expect(exported.value).toContain(
    "<strong>The useful first sentence.</strong>",
  );
  expect(exported.value).toContain("<table>");
  expect(exported.value).toContain('alt="An amber storyboard frame"');
  expect(exported.value).toContain("A moment before the first move");
});

test("block controls reopen the right image and add or delete the hovered table with undo", async ({
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  test.setTimeout(120_000);
  const ids = await createScript(page, baseURL!);
  const uploaded = await page.request.post("/api/content/scripts/images", {
    headers: { origin: baseURL! },
    multipart: {
      contentId: ids.contentId,
      variantId: ids.variantId,
      operationKey: randomUUID(),
      file: {
        name: "storyboard.png",
        mimeType: "image/png",
        buffer: await sharp({
          create: {
            width: 320,
            height: 180,
            channels: 3,
            background: "#c5a46a",
          },
        })
          .png()
          .toBuffer(),
      },
    },
  });
  expect(uploaded.ok(), await uploaded.text()).toBe(true);
  const { image } = await uploaded.json();
  const paragraph = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });
  const table = (name: string) => ({
    type: "table",
    content: [0, 1].map((row) => ({
      type: "tableRow",
      content: [0, 1].map((column) => ({
        type: row === 0 ? "tableHeader" : "tableCell",
        content: [paragraph(`${name} ${row + 1}.${column + 1}`)],
      })),
    })),
  });
  const imageNode = (alt: string) => ({
    type: "image",
    attrs: {
      mediaId: image.id,
      src: image.url,
      alt,
      caption: alt,
      size: "medium",
      textAlign: "center",
    },
  });
  const seeded = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "SAVE_SCRIPT",
      contentId: ids.contentId,
      variantId: ids.variantId,
      operationKey: randomUUID(),
      expectedScriptVersion: 1,
      document: {
        schemaVersion: 1,
        content: {
          type: "doc",
          content: [
            paragraph("Opening"),
            imageNode("First frame"),
            imageNode("Second frame"),
            table("First"),
            paragraph("Between tables"),
            table("Second"),
            paragraph("Closing"),
          ],
        },
      },
    },
  });
  expect(seeded.ok(), await seeded.text()).toBe(true);
  await page.goto(ids.url);
  const body = page.getByRole("textbox", { name: "Script body" });
  // Shift every block's document position, then edit an image while the caret is elsewhere.
  await body
    .locator(":scope > p")
    .first()
    .fill("A longer opening changes the positions of every block below.");
  const secondImage = body.getByRole("img", {
    name: "Second frame",
    exact: true,
  });
  if (isMobile) await secondImage.tap();
  else await secondImage.hover();
  const imageHandle = page.getByRole("button", {
    name: "Edit image details",
    exact: true,
  });
  await expect(imageHandle).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("image-controls.png") });
  if (isMobile) await imageHandle.tap();
  else await imageHandle.click();
  const imageDialog = page.getByRole("dialog", {
    name: "Let the image belong to the page.",
  });
  await expectSquareEditorDialog(imageDialog);
  await expect(imageDialog.getByLabel("Image description")).toHaveValue(
    "Second frame",
  );
  await imageDialog.getByLabel("Image description").fill("Edited second frame");
  await imageDialog
    .getByLabel("Caption")
    .fill("A new caption for the second frame");
  await imageDialog.getByRole("radio", { name: "Small", exact: true }).check();
  await imageDialog.getByRole("radio", { name: "Right", exact: true }).check();
  await page.screenshot({ path: testInfo.outputPath("image-dialog.png") });
  await imageDialog
    .getByRole("button", { name: "Apply image details" })
    .click();
  const secondFigure = body.locator("figure").nth(1);
  await expect(secondFigure).toHaveAttribute("data-size", "small");
  await expect(secondFigure).toHaveAttribute("data-align", "right");
  await expect(body.locator("figure").first()).toContainText("First frame");
  await body.locator(":scope > p").first().click();
  if (isMobile) {
    await secondFigure.getByRole("img").tap();
    await imageHandle.tap();
  } else {
    await secondFigure.getByRole("img").click();
    await page.keyboard.press("Tab");
    await expect(imageHandle).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(imageDialog.getByLabel("Caption")).toHaveValue(
    "A new caption for the second frame",
  );
  await imageDialog.getByRole("button", { name: "Close image" }).click();

  const firstTable = body.locator("table").first();
  for (const [label, rows, columns] of [
    ["Add column left", 2, 3],
    ["Add column right", 2, 4],
    ["Add row above", 3, 4],
    ["Add row below", 4, 4],
  ] as const) {
    if (isMobile) await firstTable.locator("th, td").first().tap();
    else await firstTable.hover();
    // Controls must use the positioned canvas, not a boxless wrapper's bounds.
    await expect
      .poll(async () => {
        const tableBounds = await firstTable.boundingBox();
        const controlBounds = await page
          .locator('.content-script-block-controls[data-kind="table"]')
          .boundingBox();
        if (!tableBounds || !controlBounds) return Infinity;
        return Math.max(
          Math.abs(tableBounds.x - controlBounds.x),
          Math.abs(tableBounds.y - controlBounds.y),
        );
      })
      .toBeLessThan(1);
    const edge = page.getByRole("button", { name: label, exact: true });
    if (!isMobile) await edge.hover();
    await expect(edge.locator("span")).toHaveCSS("opacity", "1");
    if (isMobile) await edge.tap();
    else await edge.click();
    await expect(firstTable.locator("tr")).toHaveCount(rows);
    await expect(
      firstTable.locator("tr").first().locator("th, td"),
    ).toHaveCount(columns);
    await expect(firstTable.locator("tr").first().locator("th")).toHaveCount(
      columns,
    );
    await expect(firstTable.locator("tr").first()).toContainText("First 1.1");
    await expect(firstTable.locator("tr").first()).toContainText("First 1.2");
    await expect(firstTable.locator("tr").nth(1).locator("td")).toHaveCount(
      columns,
    );
  }
  await expect(
    firstTable.locator("tr").first().locator("th").nth(1),
  ).toHaveText("First 1.1");
  await expect(firstTable.locator("tr").nth(1)).toHaveText("");
  await expect(firstTable.locator("tr").nth(2)).toContainText("First 2.1");
  // The Table menu follows the same heading rule, including repeated additions.
  for (const rows of [5, 6]) {
    await firstTable.locator("th").nth(1).click();
    await page.getByRole("button", { name: "Table", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Add row above", exact: true })
      .click();
    await expect(firstTable.locator("tr")).toHaveCount(rows);
    await expect(
      firstTable.locator("tr").first().locator("th").nth(1),
    ).toHaveText("First 1.1");
    await expect(firstTable.locator("tr").nth(1).locator("td")).toHaveCount(4);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(firstTable.locator("tr")).toHaveCount(rows - 1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(firstTable.locator("tr")).toHaveCount(rows);
  }
  await page.keyboard.press("Control+s");
  await expect(page.locator(".content-script-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await expect(firstTable.locator("tr")).toHaveCount(6);
  await expect(
    firstTable.locator("tr").first().locator("th").nth(1),
  ).toHaveText("First 1.1");
  await expect(firstTable.locator("tr").nth(1).locator("td")).toHaveCount(4);
  await expect(body.locator("table").nth(1).locator("tr")).toHaveCount(2);
  await expect(
    body.locator("table").nth(1).locator("tr").first().locator("th, td"),
  ).toHaveCount(2);
  // Deleting the hovered table must not delete the table that contains the caret.
  await body.locator("table").nth(1).locator("th").first().click();
  await firstTable.hover();
  await page
    .getByRole("button", { name: "Add row below", exact: true })
    .hover();
  await expect(
    page
      .getByRole("button", { name: "Add row below", exact: true })
      .locator("span"),
  ).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("table-controls.png") });
  await page.getByRole("button", { name: "Delete table", exact: true }).click();
  await expect(body.locator("table")).toHaveCount(1);
  await expect(body.locator("table")).toContainText("Second 1.1");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body.locator("table")).toHaveCount(2);
  await expect(firstTable.locator("tr")).toHaveCount(6);
  await firstTable.hover();
  await page.getByRole("button", { name: "Delete table", exact: true }).click();
  await page.keyboard.press("Control+s");
  await expect(page.locator(".content-script-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await expect(body.locator("table")).toHaveCount(1);
  await expect(body.locator("table")).toContainText("Second 1.1");
  await expect(secondFigure).toHaveAttribute("data-size", "small");
  await expect(secondFigure).toHaveAttribute("data-align", "right");
  await expect(secondFigure.getByRole("img")).toHaveAttribute(
    "alt",
    "Edited second frame",
  );
  await expect(secondFigure).toContainText(
    "A new caption for the second frame",
  );

  await body.locator(":scope > p").first().click();
  await page.keyboard.press("Control+k");
  const linkDialog = page.getByRole("dialog", {
    name: "Give these words a destination.",
  });
  await expectSquareEditorDialog(linkDialog);
  await linkDialog.getByRole("button", { name: "Close link" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();
  const shortcuts = page.getByRole("dialog", {
    name: "Keep your hands in the work.",
  });
  await expectSquareEditorDialog(shortcuts);
  await expect(shortcuts).toHaveCSS("animation-name", "none");
});

test("uncertain saves replay safely and two tabs offer an explicit conflict choice", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const ids = await createScript(page, baseURL!);
  await page.goto(ids.url);
  const other = await context.newPage();
  await other.goto(ids.url);
  const body = page.getByRole("textbox", { name: "Script body" });
  const otherBody = other.getByRole("textbox", { name: "Script body" });
  await expect(otherBody).toBeVisible();
  let firstKey: string | undefined;
  let replayKey: string | undefined;
  await page.route("**/api/content/commands", async (route) => {
    const request = route.request().postDataJSON();
    if (request.type !== "SAVE_SCRIPT") return route.continue();
    if (!firstKey) {
      firstKey = request.operationKey;
      await route.fetch(); // The server commits, but its response never reaches this tab.
      await route.abort("failed");
    } else {
      replayKey = request.operationKey;
      await route.continue();
    }
  });
  await body.fill("Keep this draft safe.");
  await body.press("Control+s");
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect.poll(() => replayKey).toBe(firstKey);
  await expect(page.locator(".content-script-save-state")).toContainText(
    "Saved",
  );
  await page.unroute("**/api/content/commands");
  await otherBody.fill("A competing draft.");
  await otherBody.press("Control+s");
  const conflict = other.getByRole("dialog", {
    name: "Choose the script to keep.",
  });
  await expectSquareEditorDialog(conflict);
  await expect(conflict).toContainText("Keep this draft safe.");
  await expect(conflict).toContainText("A competing draft.");
  await conflict.getByRole("button", { name: "Use latest saved" }).click();
  await expect(otherBody).toHaveText("Keep this draft safe.");
  await other.close();
  await page.reload();
  await expect(body).toHaveText("Keep this draft safe.");

  // A slow acknowledgement must not let an older save mark newer typing saved.
  const seenDrafts: string[] = [];
  let releaseFirst!: () => void;
  const heldResponse = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route("**/api/content/commands", async (route) => {
    const request = route.request().postDataJSON();
    if (request.type !== "SAVE_SCRIPT") return route.continue();
    seenDrafts.push(JSON.stringify(request.document));
    const response = await route.fetch();
    if (seenDrafts.length === 1) await heldResponse;
    await route.fulfill({ response });
  });
  await body.fill("The first pending sentence.");
  await body.press("Control+s");
  await expect.poll(() => seenDrafts.length).toBe(1);
  await body.fill("The newer sentence must also save.");
  await body.press("Control+s");
  await expect(page.locator(".content-script-save-state")).toContainText(
    "Saving",
  );
  releaseFirst();
  await expect.poll(() => seenDrafts.length).toBe(2);
  await expect(page.locator(".content-script-save-state")).toContainText(
    "Saved",
  );
  expect(seenDrafts[1]).toContain("The newer sentence must also save.");
  await page.unroute("**/api/content/commands");
  await page.reload();
  await expect(body).toHaveText("The newer sentence must also save.");
});
