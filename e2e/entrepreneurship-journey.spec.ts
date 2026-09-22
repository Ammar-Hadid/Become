import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { expect, test, type Page } from "./utils/browser-test.util";
import { emptyInterviewGuideDocument } from "../src/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";

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
  await page.waitForURL((url) => url.pathname !== "/sign-in");
  // Season entry is intentionally suppressible. This domain journey accepts
  // an available Home surface as well as the optional automatic opening.
  if (new URL(page.url()).pathname.includes("/opening"))
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
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  await page.setViewportSize({ width: 1440, height: 900 });
  const nav = page
    .getByRole("navigation", { name: "Exploration workspaces", exact: true })
    .first();
  for (const label of [
    "Overview",
    "So Far We Know",
    "Audience",
    "Outreach",
    "Conversations",
    "Evidence",
    "Offers",
  ])
    await expect(
      nav.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  for (const [old, next] of [
    ["snapshot", "so-far-we-know"],
    ["scope", "audience"],
    ["reach", "outreach"],
    ["learn/conversations", "conversations"],
    ["learn/guides", "conversations/guides"],
    ["test", "offers"],
  ]) {
    await page.goto(`${exploration.pathname}/${old}?q=retained`);
    await expect(page).toHaveURL(new RegExp(`${next}\\?q=retained$`));
  }
  for (const [old, destination, filter, expected] of [
    ["scope/businesses", "audience", "kind", "business"],
    ["learn/observations", "evidence", "sourceKind", "OBSERVATION"],
  ]) {
    await page.goto(`${exploration.pathname}/${old}?q=retained`);
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === `${exploration.pathname}/${destination}` &&
        url.searchParams.get("q") === "retained" &&
        url.searchParams.get(filter) === expected,
    );
  }
  expect(errors).toEqual([]);
});

test("large collections retain old records, panel state, message excerpts and free-form writing", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  expect(errors).toEqual([]);
});
