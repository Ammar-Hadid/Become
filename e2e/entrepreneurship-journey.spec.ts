import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";
import { emptyInterviewGuideDocument } from "../src/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";

async function captureWorkspaceErrors(page: Page) {
  const errors: string[] = [];
  const protocolErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (error) => protocolErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500)
      serverErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.exposeFunction("recordWorkspaceRuntimeError", (message: string) =>
    errors.push(message),
  );
  await page.addInitScript(() => {
    const record = (message: string) => {
      const bridge = window as typeof window & {
        recordWorkspaceRuntimeError: (message: string) => Promise<void>;
      };
      void bridge.recordWorkspaceRuntimeError(message).catch(() => {});
    };
    window.addEventListener("error", (event) => record(event.message));
    window.addEventListener("unhandledrejection", (event) =>
      record(String(event.reason)),
    );
  });
  return { errors, protocolErrors, serverErrors };
}

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByTestId("name-input")
    .fill("Disposable entrepreneurship journey QA");
  const email = `entrepreneurship-journey-${randomUUID()}@example.com`;
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-entrepreneurship-journey");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}

async function startExploration(page: Page) {
  await page.goto("/entrepreneurship");
  await page
    .getByRole("button", { name: "Start exploration", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Exploration name", exact: true })
    .fill("Customer discovery workspace");
  await page
    .getByRole("textbox", { name: "What are you exploring?" })
    .fill("How independent researchers turn replies into useful learning.");
  await page
    .getByRole("button", { name: "Start exploring", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/entrepreneurship\/explorations\/[^/]+\/overview$/,
  );
  await expect(
    page.getByRole("heading", { name: "Your next move", exact: true }),
  ).toBeVisible();
  const nicheId = new URL(page.url()).pathname.split("/")[3];
  return { pathname: `/entrepreneurship/explorations/${nicheId}`, nicheId };
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")]
      .filter((element) => {
        const r = element.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.right > window.innerWidth + 1 &&
          getComputedStyle(element).position !== "fixed"
        );
      })
      .slice(-12)
      .map((element) => ({
        tag: element.tagName,
        class: element.className,
        right: element.getBoundingClientRect().right,
        text: element.textContent?.slice(0, 90),
      })),
  }));
  expect
    .soft(overflow.scroll, `${page.url()} ${JSON.stringify(overflow)}`)
    .toBeLessThanOrEqual(overflow.width + 1);
  const clippedMessages = await page
    .locator(
      ".conversation-message-list article, .conversation-message-list article > p",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent?.slice(0, 100)),
    );
  expect
    .soft(clippedMessages, "Transcript content must wrap within its surface")
    .toEqual([]);
}
const viewports = [320, 390, 768, 1024, 1440];
const workspaces = [
  "overview",
  "so-far-we-know",
  "audience",
  "outreach",
  "conversations",
  "evidence",
  "offers",
];

test("seven direct workspaces stay usable at every target width", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const diagnostics = await captureWorkspaceErrors(page);
  await signUp(page);
  const exploration = await startExploration(page);
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const workspace of workspaces) {
      await page.goto(`${exploration.pathname}/${workspace}`);
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.getByText("Something went wrong", { exact: true }),
      ).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`${workspace}-${width}.png`),
        fullPage: true,
        animations: "disabled",
        caret: "initial",
      });
      await noOverflow(page);
    }
  }
  // Management remains reachable on phones without crowding the workspace.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${exploration.pathname}/overview`);
  await page.getByText("Manage exploration", { exact: true }).click();
  await page
    .getByRole("button", { name: "Review direction", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Where is this leading?", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review direction", exact: true }),
  ).toBeFocused();
  await page.getByText("Manage exploration", { exact: true }).click();
  await noOverflow(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${exploration.pathname}/overview`);
  const nav = page.getByRole("navigation", {
    name: "Workspace shortcuts",
    exact: true,
  });
  for (const label of [
    "Audience",
    "Outreach",
    "Conversations",
    "Evidence",
    "Offers",
  ])
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${label} `) }),
    ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open understanding" }),
  ).toHaveAttribute("href", `${exploration.pathname}/so-far-we-know`);
  for (const [old, next] of [
    ["snapshot", "so-far-we-know"],
    ["scope", "audience"],
    ["reach", "outreach"],
    ["learn/conversations", "conversations"],
    ["learn/guides", "conversations/guides"],
    ["test", "offers"],
  ]) {
    await page.goto(`${exploration.pathname}/${old}?q=retained`, {
      waitUntil: "commit",
    });
    await page.waitForURL(new RegExp(`${next}\\?q=retained$`), {
      waitUntil: "domcontentloaded",
    });
  }
  for (const [old, destination, filter, expected] of [
    ["scope/businesses", "audience", "kind", "business"],
    ["learn/observations", "evidence", "sourceKind", "OBSERVATION"],
  ]) {
    await page.goto(`${exploration.pathname}/${old}?q=retained`, {
      waitUntil: "commit",
    });
    await page.waitForURL(
      (url) =>
        url.pathname === `${exploration.pathname}/${destination}` &&
        url.searchParams.get("q") === "retained" &&
        url.searchParams.get(filter) === expected,
      { waitUntil: "domcontentloaded" },
    );
  }
  await testInfo.attach("browser-diagnostics", {
    body: JSON.stringify(diagnostics),
    contentType: "application/json",
  });
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.serverErrors).toEqual([]);
  expect(
    diagnostics.protocolErrors.filter(
      (message) =>
        !/[?&]_rsc=[^ ]+ due to access control checks\.$/.test(message),
    ),
  ).toEqual([]);
});

test("large collections retain old records, panel state, message excerpts and free-form writing", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const diagnostics = await captureWorkspaceErrors(page);
  const userId = await signUp(page);
  const { pathname, nicheId } = await startExploration(page);
  const interactions = Array.from({ length: 400 }, (_, i) => ({
    id: randomUUID(),
    userId,
    status: "COMPLETED",
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
  }));
  await prisma.interaction.createMany({ data: interactions });
  await prisma.interactionRevision.createMany({
    data: interactions.map((record, i) => ({
      id: randomUUID(),
      userId,
      interactionId: record.id,
      version: 1,
      nicheId,
      kind: i >= 300 ? "CONVERSATION" : "OUTREACH_SENT",
      occurredAt: record.createdAt,
      channel: "EMAIL",
      summary:
        i === 0
          ? "Oldest outreach with a deliberately long customer discovery subject to verify wrapping and alignment"
          : i === 300
            ? "Research participant conversation"
            : `Discovery exchange ${i}`,
      identityKind: "ANONYMOUS",
      audienceLabel: "Research participant",
    })),
  });
  const conversationId = interactions[300].id;
  const messages = Array.from({ length: 100 }, (_, i) => ({
    id: randomUUID(),
    userId,
    interactionId: conversationId,
    position: i + 1,
    operationKey: randomUUID(),
    bookmarkedAt: i === 2 ? new Date() : null,
  }));
  await prisma.conversationMessage.createMany({ data: messages });
  await prisma.conversationMessageRevision.createMany({
    data: messages.map((record, i) => ({
      id: randomUUID(),
      userId,
      messageId: record.id,
      interactionId: conversationId,
      version: 1,
      speakerRole: "PARTICIPANT",
      speakerNameSnapshot:
        i === 0
          ? "Alexandria Montgomery — independent customer research and discovery operations"
          : "Research participant",
      body: `Message ${i + 1}: We keep our interview notes in several places and lose track of the next useful follow-up.${i === 0 ? ` Source: https://example.test/research/${"long-source-reference-".repeat(9)}` : ""}`,
      occurredAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      channel: "EMAIL",
    })),
  });
  const observations = Array.from({ length: 100 }, () => ({
    id: randomUUID(),
    userId,
  }));
  await prisma.observation.createMany({ data: observations });
  await prisma.observationRevision.createMany({
    data: observations.map((record, i) => ({
      id: randomUUID(),
      userId,
      observationId: record.id,
      version: 1,
      nicheId,
      kind: "OBSERVATION",
      wordingMode: "PARAPHRASE",
      statement: `Evidence record ${i}: Interview notes are stored across several tools.`,
      observedAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      sourceKind: "DIRECT_OBSERVATION",
      sourceDescription: "Observed during a workflow review.",
      identityKind: "ANONYMOUS",
      audienceLabel: "Research participant",
    })),
  });
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId,
      title: "Free-form discovery guide",
      objective: "Explore the current workflow",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: JSON.parse(JSON.stringify(emptyInterviewGuideDocument())),
    },
  });

  await page.goto(`${pathname}/outreach?q=Oldest`);
  await expect(page.getByText(/^Oldest outreach/).first()).toBeVisible();
  await page
    .getByRole("link", { name: /Oldest outreach/ })
    .first()
    .click();
  await expect(page).toHaveURL(/q=Oldest.*selected=/);
  await expect(
    page.getByRole("link", { name: "Open full record" }),
  ).toBeVisible();
  const selectedUrl = page.url();
  await page.getByRole("link", { name: "Open full record" }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `${pathname}/outreach/${interactions[0].id}` &&
      url.searchParams.has("returnTo"),
  );
  await page.getByRole("link", { name: "Reach activity", exact: true }).click();
  await expect(page).toHaveURL(selectedUrl);
  await page.getByRole("link", { name: "Close details" }).click();
  await expect(page).toHaveURL(/q=Oldest$/);
  await page.goto(`${pathname}/outreach/${interactions[0].id}`);
  await expect(page.getByText(/^Oldest outreach/).first()).toBeVisible();
  await page.goto(`${pathname}/outreach`);
  await page.getByRole("link", { name: "More activity", exact: true }).click();
  await expect(page).toHaveURL(/cursor=/);
  const secondPageUrl = page.url();
  await page.locator(".workspace-record-main").first().click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("cursor") ===
        new URL(secondPageUrl).searchParams.get("cursor") &&
      url.searchParams.has("selected"),
  );
  await page.getByRole("link", { name: "Close details", exact: true }).click();
  await expect(page).toHaveURL(secondPageUrl);

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "outreach",
      "conversations",
      "evidence",
      `conversations/${conversationId}?message=${messages[2].id}`,
    ]) {
      await page.goto(`${pathname}/${route}`);
      await page.screenshot({
        path: testInfo.outputPath(
          `populated-${route.replaceAll(/[/?=]/g, "-")}-${width}.png`,
        ),
        fullPage: true,
        animations: "disabled",
        caret: "initial",
      });
      await noOverflow(page);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    `${pathname}/conversations/${conversationId}?message=${messages[2].id}#message-${messages[2].id}`,
  );
  await expect(page.locator(`#message-${messages[2].id}`)).toContainText(
    "Message 3:",
  );
  await page.goto(`${pathname}/conversations/${conversationId}`);
  await expect(
    page.locator('[aria-label="Conversation messages"] > li'),
  ).toHaveCount(50);

  await page.goto(`${pathname}/conversations/guides/${guide.id}/edit`);
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.fill(
    "Listen for a concrete story. Follow their lead and write freely.",
  );
  await expect
    .poll(async () =>
      JSON.stringify(
        (
          await prisma.interviewGuide.findUniqueOrThrow({
            where: { id: guide.id },
          })
        ).draftDocument,
      ),
    )
    .toContain("Listen for a concrete story");
  await page.reload();
  await expect(editor).toContainText("Follow their lead and write freely.");
  await page.screenshot({
    path: testInfo.outputPath("guide-free-writing.png"),
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "Publish edition", exact: true })
    .click();
  await expect
    .poll(() =>
      prisma.interviewGuideRevision.count({ where: { guideId: guide.id } }),
    )
    .toBe(1);
  const edition = await prisma.interviewGuideRevision.findFirstOrThrow({
    where: { guideId: guide.id },
  });
  expect(edition.questionIndex).toEqual([]);
  await testInfo.attach("browser-diagnostics", {
    body: JSON.stringify(diagnostics),
    contentType: "application/json",
  });
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.serverErrors).toEqual([]);
  expect(
    diagnostics.protocolErrors.filter(
      (message) =>
        !/[?&]_rsc=[^ ]+ due to access control checks\.$/.test(message),
    ),
  ).toEqual([]);
});

test("interview guide overlay clears the header and preserves modal controls", async ({
  page,
}, testInfo) => {
  const userId = await signUp(page);
  const { pathname, nicheId } = await startExploration(page);
  const title =
    "Customer discovery guide for independent research and operations teams";
  const questionId = randomUUID();
  const question = {
    questionId,
    prompt: "Tell me about the last time you prepared an interview.",
    intent: "Understand the current workflow",
    probes: ["Where did you keep your notes?"],
    position: 0,
  };
  const guideDocument = {
    schemaVersion: 1,
    content: {
      type: "doc",
      content: [{ type: "interviewQuestion", attrs: question }],
    },
  };
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId,
      title,
      objective: "Understand the current workflow",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: guideDocument,
      revisions: {
        create: {
          version: 1,
          titleSnapshot: title,
          objectiveSnapshot: "Understand the current workflow",
          marketType: "B2B",
          expectedDurationMinutes: 30,
          document: guideDocument,
          questionIndex: [question],
        },
      },
    },
    include: { revisions: true },
  });
  const conversation = await prisma.interaction.create({
    data: {
      userId,
      status: "IN_PROGRESS",
      revisions: {
        create: {
          version: 1,
          nicheId,
          kind: "CONVERSATION",
          occurredAt: new Date(),
          channel: "VIDEO_CALL",
          summary: "Guide overlay regression",
          identityKind: "ANONYMOUS",
          audienceLabel: "Independent researcher",
        },
      },
      interviewSession: {
        create: {
          guideRevisionId: guide.revisions[0].id,
          status: "IN_PROGRESS",
          currentQuestionId: questionId,
        },
      },
    },
  });
  const route = `${pathname}/conversations/${conversation.id}/conduct`;
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(route);
  const pane = page.locator(".conduct-guide-pane");
  await expect(pane.getByRole("heading", { name: title })).toBeVisible();
  await expect(pane).not.toHaveAttribute("role", "dialog");
  await expect(page.locator(".conduct-guide-overlay")).toHaveCount(0);
  const ask = pane.getByRole("button", { name: "Ask", exact: true });
  const desktopButtonStyle = await ask.evaluate((button) => {
    const style = getComputedStyle(button);
    return [style.fontSize, style.fontWeight, style.boxShadow];
  });
  await page.screenshot({
    path: testInfo.outputPath("guide-inline-1440.png"),
    fullPage: true,
    animations: "disabled",
  });

  for (const width of [320, 390, 900]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(route);
    const trigger = page.locator(".conduct-guide-mobile-trigger");
    await trigger.click();
    await expect(pane).toHaveAttribute("role", "dialog");
    await expect(pane).toHaveAttribute("aria-modal", "true");
    const close = pane.getByRole("button", { name: "Close interview guide" });
    await expect(close).toBeFocused();
    await close.click({ trial: true });
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    const overlay = page.locator(".workspace.conduct-guide-overlay");
    await expect(overlay).toHaveAttribute(
      "data-workspace-area",
      "entrepreneurship",
    );
    await expect(overlay).toHaveCSS("position", "fixed");
    await expect(ask).toBeVisible();
    expect(
      await ask.evaluate((button) => {
        const style = getComputedStyle(button);
        return [style.fontSize, style.fontWeight, style.boxShadow];
      }),
    ).toEqual(desktopButtonStyle);
    const heading = pane.getByRole("heading", { name: title });
    expect(
      await heading.evaluate((element) => {
        const r = element.getBoundingClientRect();
        const topmost = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return (
          r.top >= 0 &&
          r.right <= innerWidth &&
          r.bottom < innerHeight &&
          element.contains(topmost)
        );
      }),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(
      pane.getByRole("button", { name: "Skip", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    const scrollYBefore = await page.evaluate(() => scrollY);
    await page.mouse.move(width / 2, 920);
    await page.mouse.wheel(0, 500);
    expect(await page.evaluate(() => scrollY)).toBe(scrollYBefore);
    await page.screenshot({
      path: testInfo.outputPath(`guide-overlay-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(pane).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await trigger.click();
    await close.click();
    await expect(pane).toHaveCount(0);
    await expect(trigger).toBeFocused();
    if (width === 900) {
      await trigger.click();
      await page.locator(".conduct-guide-scrim").click({
        position: { x: 20, y: 400 },
      });
      await expect(pane).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    await noOverflow(page);
  }
});

test("guide formatting choices remain reachable and selecting saved text enables links", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  page.setDefaultTimeout(10_000);
  const userId = await signUp(page);
  const { pathname, nicheId } = await startExploration(page);
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId,
      title: "Research notes",
      objective: "Understand the current workflow",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: {
        schemaVersion: 1,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Saved research notes" }],
            },
          ],
        },
      },
    },
  });

  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${pathname}/conversations/guides/${guide.id}/edit`);
    const editor = page.getByRole("textbox", {
      name: "Interview guide document",
      exact: true,
    });
    await expect(editor).toHaveText("Saved research notes");
    const styleTrigger = page.getByRole("button", {
      name: "Text style",
      exact: true,
    });
    await styleTrigger.click();
    const styleMenu = page.getByRole("menu", { name: "Text style" });
    for (const label of ["Paragraph", "Section heading", "Subheading"]) {
      const item = styleMenu.getByRole("menuitemradio", {
        name: label,
        exact: true,
      });
      await expect(item).toBeVisible();
      expect(
        await item.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const visible = document.elementFromPoint(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
          );
          return element.contains(visible);
        }),
        `${label} must be visible outside the toolbar at ${width}px`,
      ).toBe(true);
    }
    await page.screenshot({
      path: testInfo.outputPath(`guide-formatting-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(styleTrigger).toBeFocused();

    await editor.click();
    await editor.press("ControlOrMeta+a");
    const addLink = page.getByRole("button", { name: "Add link", exact: true });
    await expect(addLink).toBeEnabled();
    await addLink.click();
    const address = page.getByRole("textbox", { name: "Link address" });
    await expect(address).toBeFocused();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(
      page.locator(".interview-guide-link-editor").getByRole("alert"),
    ).toHaveText("Enter a web or email address.");
    await page.screenshot({
      path: testInfo.outputPath(`guide-link-validation-${width}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Close link editor" }).click();
    await editor.click();
    await editor.press("ArrowRight");
    await expect(addLink).toBeDisabled();
    await noOverflow(page);
  }
});
