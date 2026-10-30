import "dotenv/config";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { DateTime, Settings } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { saveGoal } from "./goal.service";
import { saveSeason } from "@/features/seasons/services/season.service";
import { changeSeasonLifecycle } from "@/features/seasons/services/season-lifecycle.service";
import { getGoalView } from "@/features/direction/queries/direction.query";
import { getDirectionHistory } from "@/features/direction/queries/direction-history.query";
import { getCriterionSources } from "@/features/direction/measurements/queries/direction-preview.query";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { evaluateCriterion } from "@/features/direction/measurements/services/criterion-evaluation.service";
import type { GoalDraft } from "@/features/direction/types/direction.types";
const enabled = process.env.RUN_DIRECTION_INTEGRATION === "1";
describe.skipIf(!enabled)("Phase 5 owned local PostgreSQL", () => {
  let userId: string;
  const additionalUsers: string[] = [];
  beforeEach(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error("Local test database required");
    userId = (
      await prisma.user.create({
        data: {
          email: `phase5-${randomUUID()}@example.test`,
          name: "Disposable Phase 5 integration",
        },
      })
    ).id;
  });
  afterEach(async () => {
    for (const id of [userId, ...additionalUsers.splice(0)])
      if (id) {
        await prisma.userSeason.deleteMany({ where: { userId: id } });
        await prisma.experiment.updateMany({
          where: { userId: id },
          data: { repeatedFromId: null },
        });
        await prisma.experiment.deleteMany({ where: { userId: id } });
        await prisma.goal.deleteMany({ where: { userId: id } });
        await prisma.businessReceiptAllocation.deleteMany({
          where: { userId: id },
        });
        await prisma.offerEvent.deleteMany({ where: { userId: id } });
        await prisma.offerRevision.deleteMany({ where: { userId: id } });
        await prisma.offer.deleteMany({ where: { userId: id } });
        await prisma.interactionRevision.deleteMany({ where: { userId: id } });
        await prisma.interaction.deleteMany({ where: { userId: id } });
        await prisma.financialTransaction.deleteMany({ where: { userId: id } });
        await prisma.financialAccount.deleteMany({ where: { userId: id } });
        await prisma.company.deleteMany({ where: { userId: id } });
        await prisma.niche.deleteMany({ where: { userId: id } });
        await prisma.user.delete({ where: { id } });
      }
  });
  const draft: GoalDraft = {
    title: "Build deliberately",
    startOn: "2026-09-09",
    targetOn: "2027-03-01",
    domainIds: [],
    criterionMode: "ALL",
    criteria: [],
  };
  it("retries opening and goal creation without duplication", async () => {
    const s = {
      year: 2026,
      quarter: 3,
      expectedVersion: 0,
      operationKey: randomUUID(),
      draft: {
        character: {
          name: "",
          sourceCategory: null,
          sourceWork: "",
          adaptation: "",
        },
      },
    };
    const saved = await Promise.all([
      saveSeason(userId, s),
      saveSeason(userId, s),
    ]);
    expect(saved[0].id).toBe(saved[1].id);
    expect(await prisma.userSeason.count({ where: { userId } })).toBe(1);
    const g = { operationKey: randomUUID(), draft };
    expect(await saveGoal(userId, g)).toEqual(await saveGoal(userId, g));
    expect(await prisma.goal.count({ where: { userId } })).toBe(1);
  });
  it("preserves historical answers, saves inspiration, and rejects stale forms", async () => {
    await prisma.userSeason.create({
      data: {
        userId,
        year: 2026,
        quarter: 3,
        version: 0,
        title: "Historical title",
        intention: "Historical intention",
        answers: { meaningful: "A steady practice", deferredSteps: [2] },
        character: {
          motivation: "Keep a steady practice",
          avoid: "Old boundary",
          standards: [],
        },
      },
    });
    const d = {
      character: {
        name: "Updated identity",
        sourceCategory: null,
        sourceWork: "",
        adaptation: "",
      },
    };
    const s = await saveSeason(userId, {
      year: 2026,
      quarter: 3,
      expectedVersion: 0,
      operationKey: randomUUID(),
      draft: d,
    });
    expect((await getSeasonView(userId, 2026, 3)).answers).toMatchObject({
      meaningful: "A steady practice",
      deferredSteps: [2],
    });
    await expect(
      saveSeason(userId, {
        year: 2026,
        quarter: 3,
        expectedVersion: 0,
        operationKey: randomUUID(),
        draft: d,
      }),
    ).rejects.toThrow("changed");
    expect(s.version).toBe(1);
    const stored = await getSeasonView(userId, 2026, 3);
    expect(stored.title).toBe("Historical title");
    expect(stored.intention).toBe("Historical intention");
    expect(stored.character.motivation).toBe("Keep a steady practice");
    expect(stored.character.name).toBe("Updated identity");
    await expect(
      saveSeason(userId, {
        year: 2026,
        quarter: 3,
        expectedVersion: s.version,
        operationKey: randomUUID(),
        draft: {
          character: {
            ...d.character,
            standards: [{ key: "new", trait: "New", behavior: "Change" }],
          },
        },
      }),
    ).rejects.toThrow();
  });
  it("fulfills a late opening, snoozes one current cue, and never replays missed cues", async () => {
    const clock = Settings.now;
    const on = (day: string) => {
      Settings.now = clock;
      const millis = DateTime.fromISO(`${day}T12:00`, {
        zone: "Europe/Amsterdam",
      }).toMillis();
      Settings.now = () => millis;
    };
    try {
      on("2026-09-09");
      const opened = await saveSeason(userId, {
        year: 2026,
        quarter: 3,
        expectedVersion: 0,
        operationKey: randomUUID(),
        draft: {
          character: {
            name: "",
            sourceCategory: null,
            sourceWork: "",
            adaptation: "",
          },
        },
        complete: true,
      });
      expect((await getSeasonView(userId, 2026, 3)).cadence).toBeNull();
      on("2026-09-17");
      expect((await getSeasonView(userId, 2026, 3)).cadence?.key).toBe(
        "FINAL_14",
      );
      const snooze = {
        year: 2026,
        quarter: 3,
        expectedVersion: opened.version,
        operationKey: randomUUID(),
        action: "SNOOZE",
        milestone: "FINAL_14",
        snoozeDays: 3,
      };
      const saved = await changeSeasonLifecycle(userId, snooze);
      expect(await changeSeasonLifecycle(userId, snooze)).toEqual(saved);
      expect((await getSeasonView(userId, 2026, 3)).cadence).toBeNull();
      on("2026-09-24");
      expect((await getSeasonView(userId, 2026, 3)).cadence?.key).toBe(
        "FINAL_7",
      );
      await expect(
        changeSeasonLifecycle(userId, {
          ...snooze,
          operationKey: randomUUID(),
          expectedVersion: saved.version,
          action: "ACKNOWLEDGE",
        }),
      ).rejects.toThrow("moved on");
      const acknowledge = {
        ...snooze,
        operationKey: randomUUID(),
        expectedVersion: saved.version,
        action: "ACKNOWLEDGE",
        milestone: "FINAL_7",
      };
      expect(await changeSeasonLifecycle(userId, acknowledge)).toEqual(
        await changeSeasonLifecycle(userId, acknowledge),
      );
      expect((await getSeasonView(userId, 2026, 3)).cadence).toBeNull();
    } finally {
      Settings.now = clock;
    }
  });
  it("keeps captured source names and pages meaningful definition history", async () => {
    const source = await prisma.workSource.create({
      data: { userId, name: "Original platform", type: "PLATFORM" },
    });
    let saved = await saveGoal(userId, {
      operationKey: randomUUID(),
      draft: {
        ...draft,
        criteria: [
          {
            key: "income",
            metric: "WORK_SOURCE_INCOME",
            label: "Exact platform receipts",
            target: "1000",
            currency: "EUR",
            workSourceId: source.id,
          },
        ],
      },
    });
    await prisma.workSource.update({
      where: { id: source.id },
      data: { name: "Renamed platform" },
    });
    for (let i = 0; i < 21; i++)
      saved = await saveGoal(userId, {
        id: saved.id,
        expectedVersion: saved.version,
        operationKey: randomUUID(),
        reason: `Intentional revision ${i}`,
        draft: { ...draft, title: `Revised ${i}`, criteria: [] },
      });
    const view = (await getGoalView(userId, saved.id))!;
    expect(view.history).toHaveLength(20);
    expect(view.historyNextCursor).toBeTruthy();
    const older = await getDirectionHistory(
      userId,
      "GOAL",
      saved.id,
      view.historyNextCursor!,
    );
    expect(older.items).toHaveLength(2);
    expect(older.nextCursor).toBeNull();
    const captured = older.items
      .find((item) => item.kind === "CREATED")!
      .details.join("\n");
    expect(captured).toContain("Original platform");
    expect(captured).not.toContain("Renamed platform");
    expect(captured).toContain("1000 EUR");
    expect(captured).toContain("2027-03-01");
  });
  it("rejects another user's source and leaves no partial goal", async () => {
    const other = await prisma.user.create({
      data: {
        email: `phase5-other-${randomUUID()}@example.test`,
        name: "Other owned test fixture",
      },
    });
    additionalUsers.push(other.id);
    const source = await prisma.workSource.create({
      data: { userId: other.id, name: "Outlier", type: "PLATFORM" },
    });
    await expect(
      saveGoal(userId, {
        operationKey: randomUUID(),
        draft: {
          ...draft,
          criteria: [
            {
              key: "income",
              metric: "WORK_SOURCE_INCOME",
              label: "Outlier",
              target: "1000",
              currency: "EUR",
              workSourceId: source.id,
            },
          ],
        },
      }),
    ).rejects.toThrow("you own");
    expect(await prisma.goal.count({ where: { userId } })).toBe(0);
  });
  it("counts only Outlier earned-work EUR receipts inside the exact window", async () => {
    const account = await prisma.financialAccount.create({
      data: { userId, name: "Fixture", currency: "EUR", type: "CHECKING" },
    });
    const source = await prisma.workSource.create({
        data: { userId, name: "Outlier", type: "PLATFORM" },
      }),
      other = await prisma.workSource.create({
        data: { userId, name: "Other", type: "PLATFORM" },
      });
    for (const [workSourceId, inflowKind, date] of [
      [source.id, "EARNED_WORK", "2026-09-15"],
      [other.id, "EARNED_WORK", "2026-09-15"],
      [source.id, "GIFT", "2026-09-15"],
      [source.id, "STUDENT_FINANCE", "2026-09-15"],
      [source.id, "EARNED_WORK", "2026-12-08"],
    ] as const)
      await prisma.financialTransaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "INCOME",
          inflowKind,
          workSourceId,
          currency: "EUR",
          amountMinor: 100000n,
          occurredAt: new Date(date),
        },
      });
    const result = await evaluateCriterion(
      prisma,
      userId,
      {
        key: "outlier",
        metric: "WORK_SOURCE_INCOME",
        label: "Outlier",
        target: "1000",
        currency: "EUR",
        workSourceId: source.id,
        startOn: "2026-09-09",
        endOn: "2026-12-07",
      },
      { startOn: "2026-09-09" },
      new Date("2027-01-01"),
    );
    expect(result.value).toBe("100000");
    expect(result.sourceCount).toBe(1);
    expect(result.reached).toBe(true);
  });
  it("distinguishes zero recorded income from unconfigured qualitative judgment", async () => {
    const source = await prisma.workSource.create({
      data: { userId, name: "Outlier", type: "PLATFORM" },
    });
    const e = await evaluateCriterion(
      prisma,
      userId,
      {
        key: "i",
        metric: "WORK_SOURCE_INCOME",
        label: "Outlier",
        target: "1000",
        currency: "EUR",
        workSourceId: source.id,
      },
      { startOn: "2026-09-01" },
    );
    expect(e.availability).toBe("RECORDED_ZERO");
    expect(e.reached).toBe(false);
    const future = await evaluateCriterion(
      prisma,
      userId,
      {
        key: "future",
        metric: "WORK_SOURCE_INCOME",
        label: "Later income",
        target: "1000",
        currency: "EUR",
        workSourceId: source.id,
      },
      { startOn: "2027-01-01" },
      new Date("2026-09-09T12:00:00Z"),
    );
    expect(future).toMatchObject({
      value: null,
      reached: null,
      availability: "PARTIAL",
      sourceCount: 0,
      valueLabel: "Measurement begins 2027-01-01",
    });
    const g = await saveGoal(userId, { operationKey: randomUUID(), draft });
    expect(
      (await getGoalView(userId, g.id))?.evaluation.criteriaMet,
    ).toBeNull();
  });
  it("pages source evidence without changing totals and fingerprints the effective horizon", async () => {
    const source = await prisma.workSource.create({
      data: { userId, name: "Exact source", type: "PLATFORM" },
    });
    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: "Evidence account",
        type: "CHECKING",
        currency: "EUR",
      },
    });
    await prisma.financialTransaction.createMany({
      data: Array.from({ length: 27 }, () => ({
        userId,
        accountId: account.id,
        workSourceId: source.id,
        type: "INCOME" as const,
        inflowKind: "EARNED_WORK" as const,
        amountMinor: 1000n,
        currency: "EUR",
        occurredAt: new Date("2020-02-01T12:00:00Z"),
      })),
    });
    const definition: GoalDraft = {
      ...draft,
      startOn: "2020-01-01",
      targetOn: "2020-03-31",
      criteria: [
        {
          key: "receipts",
          metric: "WORK_SOURCE_INCOME",
          label: "Exact receipts",
          target: "270",
          currency: "EUR",
          workSourceId: source.id,
        },
      ],
    };
    const saved = await saveGoal(userId, {
      operationKey: randomUUID(),
      draft: definition,
    });
    const view = (await getGoalView(userId, saved.id))!;
    const first = view.evaluation.criteria[0];
    expect(first).toMatchObject({
      value: "27000",
      sourceCount: 27,
      nextCursor: "25",
      reached: true,
    });
    expect(first.sources).toHaveLength(25);
    const last = (await getCriterionSources(userId, view.criteria[0].id!, 25))!;
    expect(last.sources).toHaveLength(2);
    expect(last).toMatchObject({
      value: first.value,
      fingerprint: first.fingerprint,
      nextCursor: null,
    });
    expect(
      new Set([...first.sources, ...last.sources].map((s) => s.id)).size,
    ).toBe(27);
    await saveGoal(userId, {
      id: saved.id,
      expectedVersion: saved.version,
      operationKey: randomUUID(),
      reason: "Extend the evidence horizon",
      draft: { ...definition, targetOn: "2020-04-30" },
    });
    const changed = (await getGoalView(userId, saved.id))!.evaluation
      .criteria[0];
    expect(changed.value).toBe(first.value);
    expect(changed.fingerprint).not.toBe(first.fingerprint);
  });
});
