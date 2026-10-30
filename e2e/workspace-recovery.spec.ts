import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { startConversation } from "../src/features/entrepreneurship/conversations/services/conversation.service";

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `workspace-recovery-${randomUUID()}@example.test`;
  await page.getByTestId("name-input").fill("Disposable workspace recovery");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-recovery-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}

test("a record search recovers after a rejected network request", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/entrepreneurship/interactions");
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  const sourceIdentity = page
    .locator("dialog[open] summary")
    .filter({ hasText: "Source identity" });
  if (await sourceIdentity.count()) await sourceIdentity.click();
  await page.getByRole("radio", { name: "A business", exact: true }).check();
  await page.route("**/entrepreneurship/interactions", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  await page.getByRole("button", { name: /^Business / }).click();
  const menu = page.getByRole("menu", { name: "Business", exact: true });
  await expect(menu.getByRole("alert")).toContainText("Could not load records");
  await expect(menu.getByText("Loading records…")).toHaveCount(0);
  await page.unroute("**/entrepreneurship/interactions");
  await menu.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(menu.getByText("No matching records")).toBeVisible();
  await expect(menu.getByRole("alert")).toHaveCount(0);
});

test("a conversation message retries a lost acknowledgement without duplicating or changing it", async ({
  page,
}) => {
  const userId = await signUp(page);
  const niche = await prisma.niche.create({
    data: {
      userId,
      name: "Recovery audit",
      normalizedName: `recovery-${randomUUID()}`,
      scope: "Check recording recovery",
    },
  });
  const conversation = await startConversation(userId, randomUUID(), {
    nicheId: niche.id,
    identityKind: "ANONYMOUS",
    audienceLabel: "Interview participant",
    channel: "OTHER",
  });
  const pathname = `/entrepreneurship/explorations/${niche.id}/conversations/${conversation.id}/conduct`;
  await page.goto(pathname);
  const message = "A recorded message whose acknowledgement gets lost.";
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(message);
  let interrupted = false;
  await page.route(`**${pathname}`, async (route) => {
    if (route.request().method() === "POST" && !interrupted) {
      interrupted = true;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Add message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry with the same save" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue(message);
  await page.getByRole("button", { name: "Retry with the same save" }).click();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Retry with the same save" }),
  ).toHaveCount(0);
  const saved = await prisma.conversationMessage.findMany({
    where: { userId, interactionId: conversation.id },
    include: { revisions: true },
  });
  expect(saved).toHaveLength(1);
  expect(saved[0].revisions[0].body).toBe(message);
});

test("a stalled document autosave preserves newer edits and replays its original save", async ({
  page,
}) => {
  const userId = await signUp(page);
  const niche = await prisma.niche.create({
    data: {
      userId,
      name: "Autosave audit",
      normalizedName: `autosave-${randomUUID()}`,
      scope: "Check document recovery",
    },
  });
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId: niche.id,
      title: "Initial guide",
      objective: "Keep writing safe",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: {
        schemaVersion: 1,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Interview notes" }],
            },
          ],
        },
      },
    },
  });
  const pathname = `/entrepreneurship/explorations/${niche.id}/conversations/guides/${guide.id}/edit`;
  await page.goto(pathname);
  let acknowledged = false;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route(`**${pathname}`, async (route) => {
    if (route.request().method() !== "POST" || !first) return route.continue();
    first = false;
    const response = await route.fetch({ timeout: 10_000 });
    acknowledged = true;
    await held;
    await route.fulfill({ response });
  });
  const title = page.getByRole("textbox", { name: "Guide title" });
  try {
    await title.fill("First save");
    await expect
      .poll(
        async () =>
          (
            await prisma.interviewGuide.findUniqueOrThrow({
              where: { id: guide.id },
            })
          ).version,
      )
      .toBe(2);
    await expect.poll(() => acknowledged).toBe(true);
    await title.fill("Newer edits stay here");
    await expect(
      page.getByText("Save needs attention", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(title).toHaveValue("Newer edits stay here");
  } finally {
    release();
  }
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.locator(".interview-guide-save-state")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await expect(title).toHaveValue("Newer edits stay here");
  const saved = await prisma.interviewGuide.findUniqueOrThrow({
    where: { id: guide.id },
  });
  expect(saved.title).toBe("Newer edits stay here");
  expect(saved.version).toBe(3);
});
