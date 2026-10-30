import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { expect, test, type Page } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

async function signUp(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable guide draft QA");
  const email = `guide-draft-${randomUUID()}@example.test`;
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-guide-draft-audit");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}

function questionFrom(document: unknown) {
  const content = (document as { content?: { content?: unknown[] } }).content
    ?.content;
  return content?.find(
    (node) =>
      typeof node === "object" &&
      node !== null &&
      "type" in node &&
      node.type === "interviewQuestion",
  ) as { attrs: { prompt: string; probes: string[] } } | undefined;
}

test("unfinished question drafts and raw probe lines survive autosave and reload", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "One Chromium editing journey is sufficient.",
  );
  test.setTimeout(120_000);
  const userId = await signUp(page);
  const niche = await prisma.niche.create({
    data: {
      userId,
      name: "Guide draft audit",
      normalizedName: "guide draft audit",
      scope: "Interview guide editing",
    },
  });
  const guide = await prisma.interviewGuide.create({
    data: {
      userId,
      nicheId: niche.id,
      title: "Draft-safe guide",
      objective: "Keep incomplete thinking without losing structure",
      marketType: "B2B",
      expectedDurationMinutes: 30,
      draftDocument: {
        schemaVersion: 1,
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [
                {
                  type: "text",
                  text: "Preparation",
                  marks: [{ type: "underline" }],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 4 },
              content: [{ type: "text", text: "Follow-up context" }],
            },
            {
              type: "interviewQuestion",
              attrs: {
                questionId: "draft-question",
                prompt: "A question still taking shape",
                intent: "",
                probes: [],
              },
            },
          ],
        },
      },
    },
  });
  const pathname = `/entrepreneurship/explorations/${niche.id}/conversations/guides/${guide.id}`;

  await page.goto(`${pathname}/edit`);
  const prompt = page.getByRole("textbox", { name: "Ask", exact: true });
  const probes = page.getByRole("textbox", {
    name: /Follow-up prompts/,
  });
  await prompt.fill("");
  await probes.fill("First probe\n\nSecond probe\n");

  await expect
    .poll(async () => {
      const saved = await prisma.interviewGuide.findUniqueOrThrow({
        where: { id: guide.id },
      });
      return questionFrom(saved.draftDocument)?.attrs;
    })
    .toMatchObject({
      prompt: "",
      probes: ["First probe", "", "Second probe", ""],
    });

  await page.reload();
  await expect(prompt).toHaveValue("");
  await expect(probes).toHaveValue("First probe\n\nSecond probe\n");
  await prompt.fill("What happened after the interview?");
  await expect
    .poll(async () => {
      const saved = await prisma.interviewGuide.findUniqueOrThrow({
        where: { id: guide.id },
      });
      return questionFrom(saved.draftDocument)?.attrs.prompt;
    })
    .toBe("What happened after the interview?");

  await page
    .getByRole("button", { name: "Publish edition", exact: true })
    .click();
  await expect
    .poll(async () =>
      prisma.interviewGuideRevision.findFirst({ where: { guideId: guide.id } }),
    )
    .not.toBeNull();
  const published = await prisma.interviewGuideRevision.findFirstOrThrow({
    where: { guideId: guide.id },
  });
  expect(questionFrom(published.document)?.attrs.probes).toEqual([
    "First probe",
    "",
    "Second probe",
    "",
  ]);
  expect(published.questionIndex).toEqual([
    expect.objectContaining({ probes: ["First probe", "Second probe"] }),
  ]);

  await page.goto(`${pathname}/preview`);
  await expect(
    page.getByRole("heading", { name: "Preparation", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Follow-up context", level: 4 }),
  ).toBeVisible();
  await expect(page.locator("u")).toHaveText("Preparation");
  await expect(page.locator(".interview-guide-question-probes li")).toHaveCount(
    2,
  );
});
