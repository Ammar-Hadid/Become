import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { recordObservation } from "../src/features/entrepreneurship/problems/services/problem.service";
import { correctObservation } from "../src/features/entrepreneurship/observations/services/observation.service";
import { createExplorationUncertainty } from "../src/features/entrepreneurship/exploration-snapshots/services/exploration-snapshot.service";
import { readSynthesisContext } from "../src/features/entrepreneurship/synthesis/queries/synthesis-context.query";
import { SYNTHESIS_TASK } from "../src/features/nexo/constants/nexo-task.constants";

test("a saved Nexo proposal can be reviewed without credentials and accepted editions remain frozen", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
      console.error(message.text());
    }
  });
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `nexo-review-${randomUUID()}@example.com`;
  await page.getByTestId("name-input").fill("Disposable Nexo review QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-nexo-review-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const niche = await prisma.niche.create({
    data: {
      userId: user.id,
      name: "Source-backed learning",
      normalizedName: randomUUID(),
      scope: "How founders follow up after interviews.",
    },
  });
  const observation = await recordObservation(user.id, null, randomUUID(), {
    nicheId: niche.id,
    sourceKind: "DIRECT_OBSERVATION",
    observedAt: "2026-09-20",
    statement: "A founder kept follow-up notes in three places.",
    sourceDescription: "Observed during a customer workflow review.",
    marketType: "B2C",
    identityKind: "ANONYMOUS",
    audienceLabel: "Founder",
  });
  const omitted = await createExplorationUncertainty(user.id, randomUUID(), {
    nicheId: niche.id,
    lane: "B2C",
    statement: "Do larger teams have the same problem?",
  });
  const context = await prisma.$transaction((tx) =>
    readSynthesisContext(tx, user.id, niche.id),
  );
  const output = {
    schemaVersion: 1,
    title: "Fragmented follow-up notes",
    summary: "One founder kept notes in three places.",
    findings: [
      {
        claimId: null,
        kind: "FACT",
        lane: "B2C",
        statement: "Follow-up notes were stored in three places.",
        sourceKeys: [`OBSERVATION:${observation.id}`],
      },
      {
        claimId: null,
        kind: "HYPOTHESIS",
        lane: "B2C",
        statement: "A speculative finding to remove during review.",
        sourceKeys: [],
      },
    ],
    nextQuestions: ["How often are follow-ups missed?"],
    limitations:
      "One observed workflow; this does not establish a general pattern.",
  };
  const run = await prisma.nexoRun.create({
    data: {
      userId: user.id,
      operationKey: randomUUID(),
      taskId: SYNTHESIS_TASK,
      scopeId: niche.id,
      promptVersion: "so-far-we-know.v1",
      configSnapshot: {},
      inputFingerprint: context.contextFingerprint,
      input: JSON.parse(JSON.stringify(context)),
      status: "READY",
      output,
    },
  });
  const base = `/entrepreneurship/explorations/${niche.id}/so-far-we-know`;
  await page.goto(base);
  await expect(
    page.getByRole("button", { name: "Accept edition", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Observed follow-up notes were split across three places.");
  await page
    .getByText("Classification and 1 cited source", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Kind", exact: true })
    .first()
    .selectOption("INTERPRETATION");
  await page
    .getByText("Classification and 0 cited sources", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove finding", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("textbox", { name: "Question 1", exact: true })
    .fill("Which follow-up is hardest to recover?");
  await page.getByText("Coverage and limitations", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Limitations", exact: true })
    .fill("One workflow observation; prevalence is still unknown.");
  await expect(
    page
      .getByText("A founder kept follow-up notes in three places.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("proposal-review.png"),
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "Accept edition", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.nexoRun.findUniqueOrThrow({ where: { id: run.id } }))
          .status,
    )
    .toBe("ACCEPTED");
  await expect(
    page
      .getByText("Observed follow-up notes were split across three places.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  expect(
    (
      await prisma.explorationUncertainty.findUniqueOrThrow({
        where: { id: omitted.id },
      })
    ).resolvedAt,
  ).toBeNull();
  const edition = await prisma.explorationSnapshotEdition.findFirstOrThrow({
    where: { userId: user.id, nicheId: niche.id },
  });
  expect(
    await prisma.explorationClaimRevision.findMany({
      where: { userId: user.id },
      select: { kind: true },
    }),
  ).toEqual([{ kind: "INTERPRETATION" }]);
  expect(JSON.stringify(edition.synthesis)).toContain(
    "Which follow-up is hardest to recover?",
  );
  expect(JSON.stringify(edition.synthesis)).not.toContain(
    "A speculative finding to remove during review.",
  );
  await correctObservation(user.id, observation.id, randomUUID(), {
    expectedVersion: 1,
    statement: "The founder kept two active note stores and one archive.",
    sourceDescription: "Clarified archive versus active work.",
    observedAt: "2026-09-20",
    correctionReason: "Review the original workflow",
    meaningUnchanged: false,
    audienceOverride: false,
  });
  await page.reload();
  await expect(
    page.getByText("Refresh recommended", { exact: true }),
  ).toBeVisible();
  expect(await prisma.nexoRun.count({ where: { userId: user.id } })).toBe(1);
  expect(
    (
      await prisma.explorationSnapshotEdition.findUniqueOrThrow({
        where: { id: edition.id },
      })
    ).synthesis,
  ).toEqual(edition.synthesis);
  await page.goto(`${base}/history`);
  await expect(
    page
      .getByText("Observed follow-up notes were split across three places.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("frozen-edition-history.png"),
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });
  expect(errors).toEqual([]);
});
