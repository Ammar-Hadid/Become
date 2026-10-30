import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  test,
  expect,
  type Page,
  type Locator,
} from "./utils/browser-test.util";

async function createContent(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable thumbnail QA");
  await page
    .getByTestId("email-input")
    .fill(`content-thumbnail-e2e-${randomUUID()}@example.com`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-thumbnail-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  await page.goto("/content");
  await page
    .getByRole("button", { name: "Start content", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Start with the idea, not the paperwork.",
  });
  await expect(dialog.locator('input[type="file"]')).toHaveCount(0);
  await dialog.getByLabel("Working title").fill("A thumbnail can come later");
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/content/commands") &&
        r.request().postDataJSON()?.type === "CREATE_CONTENT",
    ),
    dialog.getByRole("button", { name: "Start making" }).click(),
  ]);
  expect(response.ok(), await response.text()).toBe(true);
  const { workspace } = await response.json();
  const contentId = workspace.id as string;
  const variantId = workspace.variants[0].id as string;
  await expect(page).toHaveURL(new RegExp(`/content/${contentId}$`));
  await expect(
    page.getByRole("button", { name: /^Add thumbnail/ }),
  ).toBeVisible();
  return { contentId, variantId, workspace };
}

async function picture(color: string, width = 400, height = 225) {
  return {
    name: "thumbnail.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width, height, channels: 3, background: color },
    })
      .png()
      .toBuffer(),
  };
}

function mediaResponse(page: Page, method = "POST") {
  return page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.startsWith("/api/content/media/") &&
      r.request().method() === method,
  );
}

async function chooseFile(
  page: Page,
  file: Awaited<ReturnType<typeof picture>>,
  replace = false,
  keyboard = false,
) {
  const thumbnail = page.getByTestId("content-thumbnail-editor");
  if (replace)
    await thumbnail.getByRole("button", { name: "Thumbnail options" }).click();
  const addButton = thumbnail.getByRole("button", { name: /^Add thumbnail/ });
  if (keyboard) {
    await addButton.focus();
    await expect(addButton).toBeFocused();
  }
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    replace
      ? page
          .getByRole("menuitem", { name: "Replace thumbnail", exact: true })
          .click()
      : keyboard
        ? addButton.press("Enter")
        : addButton.click(),
  ]);
  await chooser.setFiles(file);
}

async function savedImage(thumbnail: Locator, url?: string) {
  const image = thumbnail.locator("img");
  await expect(image).toBeVisible();
  if (url) await expect(image).toHaveAttribute("src", url);
  await expect
    .poll(() =>
      image.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(image).toHaveCSS("object-fit", "contain");
  const source = await image.getAttribute("src");
  expect(source).toMatch(/^\/api\/content\/media\//);
  return source!;
}

test("optional thumbnails upload, replace, remove and follow their variant across the Content desk", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  const ids = await createContent(page);
  const thumbnail = page.getByTestId("content-thumbnail-editor");
  const title = page.getByRole("heading", {
    name: "A thumbnail can come later",
    exact: true,
  });
  const initialTitleTop = (await title.boundingBox())!.y;
  await page.screenshot({ path: testInfo.outputPath("thumbnail-empty.png") });
  const portrait = await picture("#c5a46a", 240, 400);
  const [upload] = await Promise.all([
    mediaResponse(page),
    chooseFile(page, portrait, false, true),
  ]);
  expect(upload.ok(), await upload.text()).toBe(true);
  const firstUrl = await savedImage(thumbnail);
  await expect(thumbnail).toHaveAttribute("data-status", "idle");
  await expect
    .poll(async () =>
      Math.abs((await title.boundingBox())!.y - initialTitleTop),
    )
    .toBeLessThan(2);
  const manage = thumbnail.getByRole("button", { name: "Thumbnail options" });
  const manageBounds = await manage.boundingBox();
  expect(manageBounds!.width).toBeGreaterThanOrEqual(44);
  expect(manageBounds!.height).toBeGreaterThanOrEqual(44);
  await page.reload();
  await savedImage(thumbnail, firstUrl);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath("thumbnail-saved.png") });

  const added = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "CREATE_VARIANT",
      contentId: ids.contentId,
      operationKey: randomUUID(),
      name: "The landscape cut",
      format: "LONG_FORM",
    },
  });
  expect(added.ok()).toBe(true);
  const secondId = (await added.json()).variantId as string;
  await page.reload();
  await page
    .getByRole("navigation", { name: "Content variants" })
    .getByRole("button", { name: /The landscape cut/ })
    .click();
  await expect(
    thumbnail.getByRole("button", { name: /^Add thumbnail/ }),
  ).toBeVisible();
  const landscape = await picture("#45687c");
  const [secondUpload] = await Promise.all([
    mediaResponse(page),
    chooseFile(page, landscape),
  ]);
  expect(secondUpload.ok()).toBe(true);
  const secondUrl = await savedImage(thumbnail);
  expect(secondUrl).not.toBe(firstUrl);
  await page
    .getByRole("link", { name: "Back to Content", exact: true })
    .click();
  await savedImage(page.locator(".content-continue-image"), secondUrl);
  const open = page.getByRole("link", { name: "Open the workspace" });
  await expect(open).toHaveAttribute(
    "href",
    `/content/${ids.contentId}?variant=${secondId}`,
  );
  await open.click();
  await expect(
    page
      .getByRole("navigation", { name: "Content variants" })
      .getByRole("button", { name: /The landscape cut/ }),
  ).toHaveAttribute("aria-current", "page");
  await savedImage(thumbnail, secondUrl);

  // Re-selecting the exact same file must still allow replacement.
  const [replacement] = await Promise.all([
    mediaResponse(page),
    chooseFile(page, landscape, true),
  ]);
  expect(replacement.ok()).toBe(true);
  const replacementUrl = `/api/content/media/${(await replacement.json()).id}`;
  expect(replacementUrl).not.toBe(secondUrl);
  await savedImage(thumbnail, replacementUrl);
  // A newer piece moves this Content to the desk's smaller rows.
  const newer = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "CREATE_CONTENT",
      operationKey: randomUUID(),
      draft: { title: "Another piece", purpose: "", audience: "", notes: "" },
      format: "SHORT_VERTICAL",
    },
  });
  expect(newer.ok()).toBe(true);
  await page.goto("/content");
  const row = page
    .locator(".content-rows > li")
    .filter({ hasText: "A thumbnail can come later" });
  await savedImage(row, replacementUrl);
  await row.getByRole("link").click();
  await thumbnail.getByRole("button", { name: "Thumbnail options" }).click();
  const [removed] = await Promise.all([
    mediaResponse(page, "DELETE"),
    page
      .getByRole("menuitem", { name: "Remove thumbnail", exact: true })
      .click(),
  ]);
  expect(removed.ok()).toBe(true);
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await expect(
    thumbnail.getByRole("button", { name: /^Add thumbnail/ }),
  ).toBeVisible();
  await page.reload();
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Content variants" })
    .getByRole("button", { name: /^Short vertical/ })
    .click();
  await savedImage(thumbnail, firstUrl);
});

test("thumbnail validation and uncertain uploads retain the original file and recover with the same key", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await createContent(page);
  const thumbnail = page.getByTestId("content-thumbnail-editor");
  const input = thumbnail.locator('input[type="file"]');
  await input.setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("wrong format"),
  });
  await expect(thumbnail.getByRole("alert")).toContainText("Choose a still");
  await input.setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(6 * 1024 * 1024 + 1),
  });
  await expect(thumbnail.getByRole("alert")).toContainText("up to 6 MB");
  // The decoder also rejects invalid bytes disguised as an allowed format.
  const [invalid] = await Promise.all([
    mediaResponse(page),
    input.setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not png bytes"),
    }),
  ]);
  expect(invalid.status()).toBe(400);
  await expect(thumbnail.getByRole("alert")).toContainText(
    "could not be decoded",
  );

  const keys: string[] = [];
  let savedUrl = "";
  const uncertainFile = await picture("#537652");
  await page.route("**/api/content/media/upload", async (route) => {
    const form = await new Response(
      new Uint8Array(route.request().postDataBuffer()!),
      {
        headers: { "content-type": route.request().headers()["content-type"] },
      },
    ).formData();
    keys.push(String(form.get("operationKey")));
    if (keys.length === 1) {
      // WebKit's intercepted multipart body omits file bytes. Forward the
      // captured command with the original fixture to simulate a lost reply.
      const response = await page.request.post("/api/content/media/upload", {
        headers: { origin: baseURL! },
        multipart: {
          contentId: String(form.get("contentId")),
          variantId: String(form.get("variantId")),
          expectedMediaVersion: String(form.get("expectedMediaVersion")),
          operationKey: String(form.get("operationKey")),
          file: uncertainFile,
        },
      });
      expect(response.ok(), await response.text()).toBe(true);
      savedUrl = `/api/content/media/${(await response.json()).id}`;
      await route.abort("failed");
    } else await route.continue();
  });
  await input.setInputFiles(uncertainFile);
  await expect(
    thumbnail.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await thumbnail.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[1]).toBe(keys[0]);
  await savedImage(thumbnail, savedUrl);
  await page.unroute("**/api/content/media/upload");
  await page.reload();
  await savedImage(thumbnail, savedUrl);
  // File drop is an alternative to the same accessible picker.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const droppedFile = await picture("#8a5c43", 300, 300);
  const transfer = await page.evaluateHandle((bytes) => {
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array(bytes)], "dropped.png", { type: "image/png" }),
    );
    return data;
  }, Array.from(droppedFile.buffer));
  const frame = thumbnail.locator(":scope > div").first();
  await frame.dispatchEvent("dragenter", { dataTransfer: transfer });
  await expect(
    thumbnail.getByText("Drop image to upload", { exact: true }),
  ).toBeVisible();
  const [dropped] = await Promise.all([
    mediaResponse(page),
    frame.dispatchEvent("drop", { dataTransfer: transfer }),
  ]);
  expect(dropped.ok()).toBe(true);
  await savedImage(
    thumbnail,
    `/api/content/media/${(await dropped.json()).id}`,
  );
  await transfer.dispose();
});

test("thumbnail conflicts require review and delayed uploads stay with their original variant", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const ids = await createContent(page);
  const second = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "CREATE_VARIANT",
      contentId: ids.contentId,
      operationKey: randomUUID(),
      name: "A second cut",
      format: "LONG_FORM",
    },
  });
  expect(second.ok()).toBe(true);
  const secondId = (await second.json()).variantId as string;
  await page.reload();
  const thumbnail = page.getByTestId("content-thumbnail-editor");
  const other = await context.newPage();
  await other.goto(`/content/${ids.contentId}?variant=${ids.variantId}`);
  const otherThumbnail = other.getByTestId("content-thumbnail-editor");
  const [first] = await Promise.all([
    mediaResponse(page),
    chooseFile(page, await picture("#5a704e")),
  ]);
  expect(first.ok()).toBe(true);
  const firstUrl = `/api/content/media/${(await first.json()).id}`;
  const [conflict] = await Promise.all([
    mediaResponse(other),
    chooseFile(other, await picture("#6e5194")),
  ]);
  expect(conflict.status()).toBe(409);
  await expect(otherThumbnail).toHaveAttribute("data-status", "conflict");
  await otherThumbnail
    .getByRole("button", { name: "Show latest", exact: true })
    .click();
  await savedImage(otherThumbnail, firstUrl);
  await expect(otherThumbnail).toHaveAttribute("data-status", "review");
  const [confirmed] = await Promise.all([
    mediaResponse(other),
    otherThumbnail
      .getByRole("button", { name: "Replace with this image", exact: true })
      .click(),
  ]);
  expect(confirmed.ok()).toBe(true);
  const secondUrl = `/api/content/media/${(await confirmed.json()).id}`;
  await savedImage(otherThumbnail, secondUrl);
  // Declining a stale removal keeps the newer image.
  await thumbnail.getByRole("button", { name: "Thumbnail options" }).click();
  const [removeConflict] = await Promise.all([
    mediaResponse(page, "DELETE"),
    page
      .getByRole("menuitem", { name: "Remove thumbnail", exact: true })
      .click(),
  ]);
  expect(removeConflict.status()).toBe(409);
  await thumbnail
    .getByRole("button", { name: "Show latest", exact: true })
    .click();
  await thumbnail
    .getByRole("button", { name: "Keep latest", exact: true })
    .click();
  await expect(thumbnail).toHaveAttribute("data-status", "idle");
  await savedImage(thumbnail, secondUrl);
  await other.close();

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let delayedUrl = "";
  const delayedFile = await picture("#b29048");
  await page.route("**/api/content/media/upload", async (route) => {
    const form = await new Response(
      new Uint8Array(route.request().postDataBuffer()!),
      {
        headers: { "content-type": route.request().headers()["content-type"] },
      },
    ).formData();
    const response = await page.request.post("/api/content/media/upload", {
      headers: { origin: baseURL! },
      multipart: {
        contentId: String(form.get("contentId")),
        variantId: String(form.get("variantId")),
        expectedMediaVersion: String(form.get("expectedMediaVersion")),
        operationKey: String(form.get("operationKey")),
        file: delayedFile,
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
    delayedUrl = `/api/content/media/${(await response.json()).id}`;
    await held;
    await route.fulfill({ response });
  });
  await chooseFile(page, delayedFile, true);
  await expect(thumbnail).toHaveAttribute("data-status", "uploading");
  await savedImage(thumbnail, secondUrl);
  await page
    .getByRole("navigation", { name: "Content variants" })
    .getByRole("button", { name: /A second cut/ })
    .click();
  await expect(
    thumbnail.getByRole("button", { name: /^Add thumbnail/ }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Hook", exact: true })
    .fill("Keep this writing while the other variant uploads.");
  release();
  await expect.poll(() => delayedUrl).not.toBe("");
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Hook", exact: true }),
  ).toHaveValue("Keep this writing while the other variant uploads.");
  await expect(page.locator(".content-writing")).toContainText("Saved");
  await page
    .getByRole("navigation", { name: "Content variants" })
    .getByRole("button", { name: /^Short vertical/ })
    .click();
  await savedImage(thumbnail, delayedUrl);
  await page.unroute("**/api/content/media/upload");
  await page.goto(`/content/${ids.contentId}?variant=${secondId}`);
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Hook", exact: true }),
  ).toHaveValue("Keep this writing while the other variant uploads.");
  // Archival keeps imagery readable but prevents new thumbnail mutations.
  const archived = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "ARCHIVE_CONTENT",
      operationKey: randomUUID(),
      contentId: ids.contentId,
      expectedVersion: ids.workspace.version,
      archived: true,
    },
  });
  expect(archived.ok(), await archived.text()).toBe(true);
  await page.goto(`/content/${ids.contentId}?variant=${ids.variantId}`);
  await savedImage(thumbnail, delayedUrl);
  await expect(
    thumbnail.getByRole("button", { name: "Thumbnail options" }),
  ).toHaveCount(0);
  await expect(
    thumbnail.getByRole("button", { name: /^Add thumbnail/ }),
  ).toHaveCount(0);
});
