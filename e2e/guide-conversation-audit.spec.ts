import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { expect, test, type Page } from "./utils/browser-test.util";

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable guide audit");
  const email = `guide-audit-${randomUUID()}@example.test`;
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-guide-audit");
  await page.getByTestId("auth-submit").click();
  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 30_000,
  });
  if (/\/direction\/seasons\/\d{4}\/[1-4]\/opening/.test(page.url())) {
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await expect(page).toHaveURL(/\/?opening=paused$/);
  }
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}

async function startExploration(page: Page) {
  await page.goto("/entrepreneurship");
  await expect(
    page.getByRole("heading", { name: "Entrepreneurship", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start exploration", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start exploration" });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Exploration name", exact: true })
    .fill("Interview guidance audit");
  await dialog
    .getByRole("textbox", { name: "What are you exploring?" })
    .fill("How practitioners prepare, conduct, and review interviews.");
  await dialog
    .getByRole("button", { name: "Start exploring", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/entrepreneurship\/explorations\/[^/]+\/overview$/,
  );
  const nicheId = new URL(page.url()).pathname.split("/")[3];
  return {
    nicheId,
    pathname: `/entrepreneurship/explorations/${nicheId}`,
  };
}

async function startConversation(
  page: Page,
  pathname: string,
  participant: string,
  guideLabel?: string,
) {
  await page.goto(`${pathname}/conversations`);
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start a conversation" });
  await dialog
    .getByRole("textbox", { name: "Participant or group" })
    .fill(participant);
  if (guideLabel)
    await dialog
      .getByRole("combobox", { name: /Interview guide/ })
      .selectOption({ label: guideLabel });
  await dialog
    .getByRole("button", { name: "Open conversation", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`${pathname}/conversations/[^/]+/conduct$`),
  );
  return new URL(page.url()).pathname.split("/").at(-2) ?? "";
}

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test("free-form and pinned-guide conversations preserve meaning across their full lifecycle", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "One Chromium evidence journey is sufficient.",
  );
  test.setTimeout(300_000);
  page.setDefaultTimeout(20_000);
  const artifactDir = resolve("test-results/guide-audit");
  await mkdir(artifactDir, { recursive: true });

  const userId = await signUp(page);
  const { nicheId, pathname } = await startExploration(page);

  const olderParticipant = await prisma.person.create({
    data: {
      userId,
      name: "Older reply participant",
      normalizedName: "older reply participant",
      niches: { create: { nicheId } },
    },
  });
  const replyContext = await prisma.audienceContext.create({
    data: {
      userId,
      marketType: "B2B",
      description: "Independent researchers preparing interview debriefs",
    },
  });
  const reachRecords = Array.from({ length: 30 }, (_, index) => ({
    id: randomUUID(),
    userId,
    status: "COMPLETED",
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
  }));
  await prisma.interaction.createMany({ data: reachRecords });
  await prisma.interactionRevision.createMany({
    data: reachRecords.map((record, index) => ({
      id: randomUUID(),
      userId,
      interactionId: record.id,
      version: 1,
      nicheId,
      kind: index === 0 ? "REPLY_RECEIVED" : "OUTREACH_SENT",
      channel: "EMAIL",
      occurredAt: record.createdAt,
      summary:
        index === 0
          ? "Old reply retained beyond the first page"
          : `More recent outreach ${index}`,
      identityKind: index === 0 ? "PERSON" : "ANONYMOUS",
      personId: index === 0 ? olderParticipant.id : null,
      personSnapshot: index === 0 ? olderParticipant.name : null,
      audienceLabel: index === 0 ? null : `Outreach recipient ${index}`,
      audienceContextId: index === 0 ? replyContext.id : null,
    })),
  });

  await page.goto(`${pathname}/conversations`);
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  const linkedDialog = page.getByRole("dialog", {
    name: "Start a conversation",
  });
  await linkedDialog
    .getByRole("button", { name: /Continue from a reply/ })
    .click();
  await linkedDialog.getByText("Load more", { exact: true }).click();
  await linkedDialog
    .getByText(/Older reply participant · Old reply retained beyond/)
    .click();
  await expect(
    linkedDialog.getByRole("textbox", { name: "Participant or group" }),
  ).toHaveCount(0);
  await linkedDialog
    .getByRole("button", { name: "Open conversation", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`${pathname}/conversations/[^/]+/conduct$`),
  );
  const linkedConversationId = new URL(page.url()).pathname.split("/").at(-2)!;
  const linkedRevision = await prisma.interactionRevision.findFirstOrThrow({
    where: { interactionId: linkedConversationId, version: 1 },
    include: { audienceContext: true },
  });
  expect(linkedRevision).toMatchObject({
    personId: olderParticipant.id,
    personSnapshot: "Older reply participant",
    respondsToInteractionId: reachRecords[0].id,
  });
  expect(linkedRevision.audienceContext).toMatchObject({
    marketType: "B2B",
    description: "Independent researchers preparing interview debriefs",
  });

  const freeformId = await startConversation(
    page,
    pathname,
    "Free-form participant",
  );
  await expect(
    page.getByText("Free-form conversation", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(
      "We prepare interview notes in a document, then lose the follow-up context.",
    );
  await page.getByRole("button", { name: "Add message", exact: true }).click();
  await expect(
    page.locator(".conversation-message-list p").filter({
      hasText:
        "We prepare interview notes in a document, then lose the follow-up context.",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Pause conversation", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Pause this conversation" })
    .getByRole("button", { name: "Pause conversation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume conversation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume conversation", exact: true })
    .click();
  await expect
    .poll(async () =>
      prisma.interviewSession.findUniqueOrThrow({
        where: {
          interactionId_userId: { interactionId: freeformId, userId },
        },
      }),
    )
    .toMatchObject({ status: "IN_PROGRESS" });
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(artifactDir, "freeform-resumed-390.png"),
    fullPage: true,
    animations: "disabled",
  });
  await expectNoOverflow(page);

  await page
    .getByRole("button", { name: "Finish conversation", exact: true })
    .click();
  const debrief = page.getByRole("dialog", { name: "Finish and debrief" });
  await expect(debrief).toBeVisible();
  await debrief
    .getByRole("textbox", { name: "Outcome", exact: true })
    .fill("The workflow and its weak handoff are clear.");
  await debrief
    .getByRole("textbox", { name: "Next action · optional", exact: true })
    .fill("Ask for a copy of the current interview template.");
  await debrief
    .getByRole("button", { name: "Complete debrief", exact: true })
    .click();
  await expect(debrief).toHaveCount(0);
  expect(
    await prisma.followUp.count({
      where: { userId, interactionId: freeformId },
    }),
  ).toBe(0);
  await expect
    .poll(async () =>
      prisma.interviewSession.findUniqueOrThrow({
        where: { interactionId_userId: { interactionId: freeformId, userId } },
      }),
    )
    .toMatchObject({
      status: "COMPLETED",
      nextAction: "Ask for a copy of the current interview template.",
    });

  const publishedDocument = {
    schemaVersion: 1,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Follow the current workflow" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Begin with a concrete recent example before discussing improvements.",
            },
          ],
        },
        {
          type: "interviewQuestion",
          attrs: {
            questionId: "workflow-last-example",
            prompt: "Walk me through the last interview you prepared.",
            intent: "Understand the actual sequence and handoffs.",
            probes: ["Where did the notes live?", "What happened afterward?"],
          },
        },
      ],
    },
  };
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId,
      title: "Pinned workflow guide",
      objective: "Understand interview preparation and follow-through",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: JSON.parse(JSON.stringify(publishedDocument)),
    },
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${pathname}/conversations/guides/${guide.id}/edit`);
  await page
    .getByRole("button", { name: "Publish edition", exact: true })
    .click();
  await expect
    .poll(() =>
      prisma.interviewGuideRevision.count({ where: { guideId: guide.id } }),
    )
    .toBe(1);

  const guidedId = await startConversation(
    page,
    pathname,
    "Guided participant",
    "Pinned workflow guide · revision 1",
  );
  await expect(
    page.getByRole("heading", { name: "Pinned workflow guide", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Begin with a concrete recent example before discussing improvements.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Walk me through the last interview you prepared.",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(artifactDir, "guided-conduct-1440.png"),
    fullPage: true,
    animations: "disabled",
  });
  await expectNoOverflow(page);

  await page.goto(`${pathname}/conversations/guides/${guide.id}/edit`);
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await editor.fill(
    "This draft now explores a different follow-up, without changing conversations already in progress.",
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
    .toContain("different follow-up");

  await page.goto(`${pathname}/conversations/${guidedId}/conduct`);
  await expect(
    page.getByText(
      "Begin with a concrete recent example before discussing improvements.",
    ),
  ).toBeVisible();
  await expect(page.getByText("different follow-up")).toHaveCount(0);
  const session = await prisma.interviewSession.findUniqueOrThrow({
    where: { interactionId_userId: { interactionId: guidedId, userId } },
    include: { guideRevision: true },
  });
  expect(session.guideRevision?.version).toBe(1);
  expect(JSON.stringify(session.guideRevision?.document)).toContain(
    "concrete recent example",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Guide · 1 of 1", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Pinned workflow guide", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(artifactDir, "guided-conduct-390.png"),
    fullPage: true,
    animations: "disabled",
  });
  await expectNoOverflow(page);
});
