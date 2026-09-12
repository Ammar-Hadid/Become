import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { deleteDisposableBrowserUser } from "../../../../e2e/utils/disposable-user.util";
import { evaluateCriterion } from "@/features/direction/measurements/services/criterion-evaluation.service";
import {
  getGoalView,
  getExperimentView,
} from "@/features/direction/queries/direction.query";
import { saveGoal } from "./goal.service";
import { saveExperiment } from "./experiment.service";
import { changeDirectionLifecycle } from "./direction-lifecycle.service";
import { assessCriterion } from "@/features/direction/evidence/services/criterion-assessment.service";
import {
  setEngineeringProjectArchived,
  updateEngineeringProject,
} from "@/features/engineering/projects/services/engineering-project.service";
import { engineeringProjectSchema } from "@/features/engineering/schemas/engineering.schema";
import {
  saveSeason,
  assignSeasonGoals,
} from "@/features/seasons/services/season.service";
import { changeSeasonLifecycle } from "@/features/seasons/services/season-lifecycle.service";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
import type {
  CriterionDraft,
  ExperimentDraft,
  GoalDraft,
} from "@/features/direction/types/direction.types";
const enabled = process.env.RUN_DIRECTION_INTEGRATION === "1";
const horizon = { startOn: "2026-07-01", targetOn: "2026-09-30" };
const at = new Date("2026-10-01T12:00:00Z");
describe.skipIf(!enabled)("Phase 5 exact evidence and history", () => {
  let userId: string, email: string;
  beforeEach(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error("Local database required");
    email = `phase5-evidence-${randomUUID()}@example.test`;
    userId = (
      await prisma.user.create({
        data: { email, name: "Disposable evidence QA" },
      })
    ).id;
  });
  afterEach(async () => {
    if (userId) await deleteDisposableBrowserUser(userId, email);
  });
  const goal = (criteria: CriterionDraft[]): GoalDraft => ({
    title: "Exact evidence",
    ...horizon,
    domainIds: [],
    criterionMode: "ALL",
    criteria,
  });
  async function company(name = randomUUID()) {
    return prisma.company.create({
      data: { userId, name, normalizedName: name.toLowerCase() },
    });
  }
  async function niche(name: string) {
    return prisma.niche.create({
      data: { userId, name, normalizedName: name.toLowerCase() },
    });
  }
  async function interaction(
    companyId: string,
    nicheId: string,
    kind = "CONVERSATION",
    respondsToInteractionId?: string,
    date = "2026-08-10T12:00:00Z",
  ) {
    const row = await prisma.interaction.create({ data: { userId } });
    await prisma.interactionRevision.create({
      data: {
        userId,
        interactionId: row.id,
        version: 1,
        companyId,
        nicheId,
        kind,
        channel: "EMAIL",
        summary: `${kind} fixture`,
        occurredAt: new Date(date),
        respondsToInteractionId,
      },
    });
    return row;
  }
  async function terms(
    companyId: string,
    priceMinor = 15000n,
    basis = "RECURRING",
  ) {
    const offer = await prisma.offer.create({ data: { userId, companyId } });
    const revision = await prisma.offerRevision.create({
      data: {
        userId,
        offerId: offer.id,
        companyId,
        version: 1,
        title: "Monthly service",
        scope: "Ongoing service",
        companySnapshot: "Fixture",
        priceBasis: basis,
        priceMinor,
        currency: "EUR",
        intervalUnit: basis === "RECURRING" ? "MONTH" : null,
        intervalCount: basis === "RECURRING" ? 1 : null,
        proposedAt: new Date("2026-07-01"),
      },
    });
    await prisma.offerEvent.createMany({
      data: [
        {
          userId,
          offerId: offer.id,
          offerRevisionId: revision.id,
          kind: "PROPOSED",
          occurredAt: new Date("2026-07-01"),
          sourceDescription: "Test proposal",
        },
        {
          userId,
          offerId: offer.id,
          offerRevisionId: revision.id,
          kind: "ACCEPTED",
          occurredAt: new Date("2026-07-02"),
          sourceDescription: "Test acceptance",
        },
      ],
    });
    return revision;
  }
  async function receipt(
    companyId: string,
    revisionId?: string,
    amount = 1000n,
    date = "2026-08-01T12:00:00Z",
    portion = amount,
  ) {
    const account = await prisma.financialAccount.create({
      data: { userId, name: randomUUID(), type: "CHECKING", currency: "EUR" },
    });
    const transaction = await prisma.financialTransaction.create({
      data: {
        userId,
        accountId: account.id,
        amountMinor: amount,
        currency: "EUR",
        type: "INCOME",
        inflowKind: "BUSINESS_REVENUE",
        occurredAt: new Date(date),
      },
    });
    const allocation = await prisma.businessReceiptAllocation.create({
      data: {
        userId,
        companyId,
        offerRevisionId: revisionId,
        transactionId: transaction.id,
        originalTransactionId: transaction.id,
        amountMinor: portion,
        currencySnapshot: "EUR",
        occurredAtSnapshot: transaction.occurredAt,
        companySnapshot: "Fixture",
      },
    });
    return { transaction, allocation };
  }
  const recurring = (
    companyId?: string,
    extra: Partial<CriterionDraft> = {},
  ): CriterionDraft => ({
    key: "recurring",
    metric: "NEW_RECURRING_COMPANY",
    label: "A new monthly relationship",
    target: "150",
    currency: "EUR",
    companyId,
    ...extra,
  });
  it("never assembles recurring conditions from different companies or revisions", async () => {
    const a = await company(),
      b = await company(),
      quoted = await terms(a.id),
      oneOff = await terms(b.id, 20000n, "FIXED");
    await receipt(b.id, oneOff.id, 50000n);
    const c = recurring(undefined, {
      baselineAssertions: [
        {
          companyId: a.id,
          noPriorPaidRelationship: true,
          note: "Reviewed my prior clients",
        },
        {
          companyId: b.id,
          noPriorPaidRelationship: true,
          note: "Reviewed my prior clients",
        },
      ],
    });
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(false);
    await receipt(a.id, undefined, 50000n);
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(false);
    await receipt(a.id, quoted.id, 100n);
    const result = await evaluateCriterion(prisma, userId, c, horizon, at);
    expect(result.reached).toBe(true);
    expect(result.value).toBe("1");
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, minimumReceived: "150" },
          horizon,
          at,
        )
      ).reached,
    ).toBe(false);
  });
  it("requires baseline judgment and excludes prior clients, pending attribution, and withdrawn receipts", async () => {
    const a = await company(),
      revision = await terms(a.id),
      paid = await receipt(a.id, revision.id);
    const c = recurring(a.id);
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).availability,
    ).toBe("PENDING_REVIEW");
    c.baselineAssertions = [
      {
        companyId: a.id,
        noPriorPaidRelationship: true,
        note: "Reviewed complete client history",
      },
    ];
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(true);
    await prisma.businessReceiptAllocation.update({
      where: { id: paid.allocation.id },
      data: { needsReviewAt: new Date() },
    });
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBeNull();
    await prisma.businessReceiptAllocation.update({
      where: { id: paid.allocation.id },
      data: { needsReviewAt: null, withdrawnAt: new Date() },
    });
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(false);
    await prisma.businessReceiptAllocation.update({
      where: { id: paid.allocation.id },
      data: { withdrawnAt: null },
    });
    await receipt(a.id, undefined, 500n, "2026-06-15T12:00:00Z");
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(false);
  });
  it("sums the full eligible receipt set and applies acceptance state at receipt time", async () => {
    const a = await company(),
      revision = await terms(a.id);
    for (let i = 0; i < 27; i++) await receipt(a.id, revision.id, 100n);
    await prisma.offerEvent.create({
      data: {
        userId,
        offerId: revision.offerId,
        offerRevisionId: revision.id,
        kind: "CANCELLED",
        occurredAt: new Date("2026-08-02"),
        sourceDescription: "Stopped",
      },
    });
    await receipt(a.id, revision.id, 100000n, "2026-08-03");
    const c = recurring(a.id, {
      minimumReceived: "27",
      baselineAssertions: [
        {
          companyId: a.id,
          noPriorPaidRelationship: true,
          note: "Reviewed history",
        },
      ],
    });
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).reached,
    ).toBe(true);
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, minimumReceived: "28" },
          horizon,
          at,
        )
      ).reached,
    ).toBe(false);
  });
  it("counts logical niche conversations, keeps company count distinct, and excludes indirect trial links", async () => {
    const a = await company(),
      dentists = await niche("Dentists"),
      bakeries = await niche("Bakeries");
    const outreach = await interaction(
      a.id,
      dentists.id,
      "OUTREACH_SENT",
      undefined,
      "2026-08-01",
    );
    const direct = await interaction(
        a.id,
        dentists.id,
        "CONVERSATION",
        outreach.id,
      ),
      unlinked = await interaction(a.id, dentists.id);
    await interaction(a.id, bakeries.id);
    await interaction(a.id, dentists.id, "REPLY_RECEIVED", outreach.id);
    const c: CriterionDraft = {
      key: "talks",
      metric: "CONVERSATIONS",
      label: "Dentists",
      target: "10",
      nicheId: dentists.id,
    };
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).value,
    ).toBe("2");
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, metric: "CONVERSATION_COMPANIES" },
          horizon,
          at,
        )
      ).value,
    ).toBe("1");
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, selectedOutreachOnly: true },
          horizon,
          at,
          [outreach.id],
        )
      ).value,
    ).toBe("1");
    for (const emptyCohort of [[], undefined]) {
      expect(
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, selectedOutreachOnly: true },
          horizon,
          at,
          emptyCohort,
        ),
      ).toMatchObject({
        value: null,
        reached: null,
        availability: "NOT_CONFIGURED",
        sourceCount: 0,
      });
    }
    const old = await prisma.interactionRevision.findFirstOrThrow({
      where: { interactionId: direct.id },
    });
    const { id: ignored, createdAt: ignoredDate, ...data } = old;
    void ignored;
    void ignoredDate;
    await prisma.interactionRevision.create({
      data: {
        ...data,
        participants: [],
        version: 2,
        nicheId: bakeries.id,
        correctionReason: "Different market",
      },
    });
    await prisma.interaction.update({
      where: { id: direct.id },
      data: { version: 2 },
    });
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          { ...c, selectedOutreachOnly: true },
          horizon,
          at,
          [outreach.id],
        )
      ).value,
    ).toBe("0");
    await prisma.interaction.update({
      where: { id: unlinked.id },
      data: { voidedAt: new Date() },
    });
    expect(
      (await evaluateCriterion(prisma, userId, c, horizon, at)).value,
    ).toBe("0");
  });
  it("keeps the conclusion snapshot when a cited source changes and rejects stale previews", async () => {
    const a = await company(),
      n = await niche("Customers"),
      source = await interaction(a.id, n.id);
    const saved = await saveGoal(userId, {
      operationKey: randomUUID(),
      draft: goal([
        {
          key: "judgment",
          metric: "MANUAL",
          label: "Maintain a useful relationship",
          target: "",
        },
      ]),
    });
    const before = (await getGoalView(userId, saved.id))!;
    const assessment = await assessCriterion(userId, {
      criterionId: before.criteria[0].id,
      expectedVersion: saved.version,
      operationKey: randomUUID(),
      confirmed: true,
      rationale: "The conversation established ongoing needs",
      assessedOn: "2026-08-12",
      sources: [{ type: "INTERACTION", id: source.id }],
    });
    const preview = (await getGoalView(userId, saved.id))!;
    const conclude = {
      kind: "GOAL",
      id: saved.id,
      expectedVersion: assessment.version,
      operationKey: randomUUID(),
      action: "CONCLUDE",
      reason: "Confirmed with dated evidence",
      outcome: "ACHIEVED",
      previewFingerprint: preview.evaluation.fingerprint,
    };
    const concurrentConclusions = await Promise.all([
      changeDirectionLifecycle(userId, conclude),
      changeDirectionLifecycle(userId, conclude),
      changeDirectionLifecycle(userId, conclude),
    ]);
    expect(concurrentConclusions[1]).toEqual(concurrentConclusions[0]);
    expect(concurrentConclusions[2]).toEqual(concurrentConclusions[0]);
    expect(
      await prisma.goalChange.count({
        where: { userId, goalId: saved.id, kind: "CONCLUDE" },
      }),
    ).toBe(1);
    await prisma.interaction.update({
      where: { id: source.id },
      data: { voidedAt: new Date() },
    });
    const after = (await getGoalView(userId, saved.id))!;
    expect(after.outcome).toBe("ACHIEVED");
    expect(after.conclusionSnapshot?.criteriaMet).toBe(true);
    expect(after.evaluation.criteriaMet).toBeNull();
    expect(after.liveChangedSinceConclusion).toBe(true);
    const reopened = await changeDirectionLifecycle(userId, {
      kind: "GOAL",
      id: saved.id,
      expectedVersion: after.version,
      operationKey: randomUUID(),
      action: "REOPEN",
      reason: "Reassess the changed source",
    });
    await expect(
      changeDirectionLifecycle(userId, {
        ...conclude,
        operationKey: randomUUID(),
        expectedVersion: reopened.version,
      }),
    ).rejects.toThrow("Evidence changed");
    await prisma.interactionRevision.deleteMany({
      where: { interactionId: source.id, userId },
    });
    await prisma.interaction.delete({ where: { id: source.id } });
    const missing = (await getGoalView(userId, saved.id))!;
    expect(missing.evaluation.criteria[0].sources[0]).toMatchObject({
      state: "MISSING",
      href: null,
    });
    expect(missing.conclusionSnapshot?.criteriaMet).toBe(true);
  });
  it("repeats an experiment as a separate bounded attempt without rewriting the original", async () => {
    const draft: ExperimentDraft = {
      title: "Try a clearer introduction",
      question: "Does it make the next step easier?",
      approach: "Use one direct question",
      ...horizon,
      domainIds: [],
      sourceInteractionIds: [],
      criteria: [],
      criterionMode: "ALL",
    };
    const saved = await saveExperiment(userId, {
      operationKey: randomUUID(),
      draft,
    });
    const view = (await getExperimentView(userId, saved.id))!;
    await changeDirectionLifecycle(userId, {
      kind: "EXPERIMENT",
      id: saved.id,
      expectedVersion: saved.version,
      operationKey: randomUUID(),
      action: "CONCLUDE",
      outcome: "INCONCLUSIVE",
      reason: "Too little evidence",
      result: "One attempt",
      learning: "Try a larger, explicitly selected set",
      previewFingerprint: view.evaluation.fingerprint,
    });
    const repeated = await saveExperiment(userId, {
      operationKey: randomUUID(),
      draft: {
        ...draft,
        repeatedFromId: saved.id,
        startOn: "2026-10-01",
        targetOn: "2026-10-07",
      },
    });
    expect(repeated.id).not.toBe(saved.id);
    expect(
      (await getExperimentView(userId, repeated.id))?.previousAttempt?.id,
    ).toBe(saved.id);
    expect((await getExperimentView(userId, saved.id))?.status).toBe(
      "CONCLUDED",
    );
  });
  it("closes an ended chapter without resetting its continuing goal", async () => {
    const saved = await saveSeason(userId, {
      year: 2026,
      quarter: 2,
      expectedVersion: 0,
      operationKey: randomUUID(),
      draft: { ...emptySeasonDraft(), title: "Earlier chapter" },
      complete: true,
    });
    const g = await saveGoal(userId, {
      operationKey: randomUUID(),
      draft: { ...goal([]), startOn: "2026-04-01", targetOn: "2027-03-01" },
    });
    const role = await assignSeasonGoals(userId, {
      year: 2026,
      quarter: 2,
      expectedVersion: saved.version,
      operationKey: randomUUID(),
      goals: [{ goalId: g.id, role: "PRIMARY" }],
    });
    const input = {
      year: 2026,
      quarter: 2,
      expectedVersion: role.version,
      operationKey: randomUUID(),
      action: "CLOSE",
      note: "Keep the practice",
    };
    expect(await changeSeasonLifecycle(userId, input)).toEqual(
      await changeSeasonLifecycle(userId, input),
    );
    const season = await getSeasonView(userId, 2026, 2);
    expect(season.readyForReview).toBe(true);
    expect(season.closingSnapshot).toMatchObject({ title: "Earlier chapter" });
    expect(season.closingCard?.outcomes).toEqual([
      expect.objectContaining({
        id: g.id,
        kind: "GOAL",
        role: "PRIMARY",
        stateLabel: "Active",
      }),
    ]);
    const capturedTitle = season.closingCard?.primaryGoal?.title;
    await saveGoal(userId, {
      id: g.id,
      expectedVersion: g.version,
      operationKey: randomUUID(),
      reason: "The intention evolved after closing",
      draft: {
        ...goal([]),
        title: "Later direction",
        startOn: "2026-04-01",
        targetOn: "2027-03-01",
      },
    });
    const changed = await getSeasonView(userId, 2026, 2);
    expect(changed.closingCard?.primaryGoal?.title).toBe(capturedTitle);
    expect(changed.goals[0].goal.title).toBe("Later direction");
    expect((await getGoalView(userId, g.id))!).toMatchObject({
      status: "ACTIVE",
      targetOn: "2027-03-01",
    });
  });
  it("clips completed focus time to the chosen window and counts project evidence independently", async () => {
    const domain = await prisma.domain.create({
      data: { userId, name: "Engineering", slug: "engineering", icon: "Code" },
    });
    const activity = await prisma.activityType.create({
      data: { domainId: domain.id, name: "Coding", slug: "coding" },
    });
    const project = await prisma.engineeringProject.create({
      data: { userId, name: "Owned project" },
    });
    const other = await prisma.engineeringProject.create({
      data: { userId, name: "Other project" },
    });
    await prisma.session.create({
      data: {
        userId,
        domainId: domain.id,
        activityTypeId: activity.id,
        engineeringProjectId: project.id,
        engineeringContext: "PERSONAL",
        startedAt: new Date("2026-06-30T21:30:00Z"),
        endedAt: new Date("2026-06-30T22:30:00Z"),
      },
    });
    await prisma.session.create({
      data: {
        userId,
        domainId: domain.id,
        activityTypeId: activity.id,
        engineeringProjectId: other.id,
        engineeringContext: "PERSONAL",
        startedAt: new Date("2026-07-01T12:00:00Z"),
        endedAt: new Date("2026-07-01T13:00:00Z"),
      },
    });
    await prisma.session.create({
      data: {
        userId,
        domainId: domain.id,
        activityTypeId: activity.id,
        engineeringProjectId: project.id,
        engineeringContext: "PERSONAL",
        startedAt: new Date("2026-07-01T14:00:00Z"),
      },
    });
    const focus = await evaluateCriterion(
      prisma,
      userId,
      {
        key: "focus",
        metric: "SESSION_TIME",
        label: "Project",
        target: "30",
        projectId: project.id,
      },
      horizon,
      at,
    );
    expect(focus.value).toBe("1800");
    expect(focus.reached).toBe(true);
    expect(focus.sourceCount).toBe(1);
    await prisma.engineeringEvidence.createMany({
      data: [
        {
          userId,
          projectId: project.id,
          title: "Feature",
          type: "FEATURE_COMPLETED",
          occurredAt: new Date("2026-07-01"),
        },
        {
          userId,
          projectId: other.id,
          title: "Unrelated feature",
          type: "FEATURE_COMPLETED",
          occurredAt: new Date("2026-07-01"),
        },
        {
          userId,
          projectId: project.id,
          title: "Bug",
          type: "BUG_SOLVED",
          occurredAt: new Date("2026-07-01"),
        },
      ],
    });
    expect(
      (
        await evaluateCriterion(
          prisma,
          userId,
          {
            key: "outputs",
            metric: "ENGINEERING_EVIDENCE",
            label: "Project features",
            target: "1",
            projectId: project.id,
            evidenceType: "FEATURE_COMPLETED",
          },
          horizon,
          at,
        )
      ).value,
    ).toBe("1");
  });
  it("uses canonical project status and preserves Goal conclusions when the project reopens", async () => {
    const project = await prisma.engineeringProject.create({
      data: { userId, name: "Deliver the project", status: "ACTIVE" },
    });
    // Neither a different completed project with the same name nor outputs prove completion.
    await prisma.engineeringProject.create({
      data: {
        userId,
        name: project.name,
        status: "COMPLETED",
        completedOn: new Date("2026-08-01"),
      },
    });
    await prisma.engineeringEvidence.createMany({
      data: ["FEATURE_COMPLETED", "DEPLOYMENT"].map((type) => ({
        userId,
        projectId: project.id,
        title: "Project output",
        type: type as "FEATURE_COMPLETED" | "DEPLOYMENT",
      })),
    });
    const saved = await saveGoal(userId, {
      operationKey: randomUUID(),
      draft: goal([
        {
          key: "completion",
          metric: "ENGINEERING_PROJECT_COMPLETED",
          label: "Complete the selected project",
          target: "",
          projectId: project.id,
        },
      ]),
    });
    const active = (await getGoalView(userId, saved.id))!;
    expect(active.evaluation.criteriaMet).toBe(false);
    expect(active.criterionScopes.completion.projectId?.id).toBe(project.id);
    expect(active.history[0].details.join(" ")).toContain(project.name);
    const conclude = {
      kind: "GOAL",
      id: saved.id,
      expectedVersion: saved.version,
      action: "CONCLUDE",
      outcome: "ACHIEVED",
      reason: "The selected project is completed",
    };
    await expect(
      changeDirectionLifecycle(userId, {
        ...conclude,
        operationKey: randomUUID(),
        previewFingerprint: active.evaluation.fingerprint,
      }),
    ).rejects.toThrow("required criteria have not been established");

    const update = (status: "COMPLETED" | "ACTIVE") =>
      updateEngineeringProject(
        userId,
        project.id,
        engineeringProjectSchema.parse({
          name: project.name,
          context: "PERSONAL",
          status,
        }),
      );
    expect((await update("COMPLETED")).status).toBe("updated");
    const completed = (await getGoalView(userId, saved.id))!;
    expect(completed.evaluation.criteriaMet).toBe(true);
    expect(completed.status).toBe("ACTIVE");
    expect(completed.history).toHaveLength(active.history.length);
    expect(completed.evaluation.criteria[0].sources[0]).toMatchObject({
      id: project.id,
      value: "Completed",
      state: "QUALIFYING",
    });
    await expect(
      changeDirectionLifecycle(userId, {
        ...conclude,
        operationKey: randomUUID(),
        previewFingerprint: active.evaluation.fingerprint,
      }),
    ).rejects.toThrow("Evidence changed");

    await setEngineeringProjectArchived(userId, project.id, true);
    const archived = (await getGoalView(userId, saved.id))!;
    expect(archived.evaluation.criteriaMet).toBe(true);
    expect(archived.evaluation.fingerprint).toBe(
      completed.evaluation.fingerprint,
    );
    await changeDirectionLifecycle(userId, {
      ...conclude,
      operationKey: randomUUID(),
      previewFingerprint: archived.evaluation.fingerprint,
    });
    const concluded = (await getGoalView(userId, saved.id))!;
    const snapshot = concluded.conclusionSnapshot;
    const conclusionHistory = concluded.history.find(
      (change) => change.kind === "CONCLUDE",
    );

    await update("ACTIVE");
    const reopened = (await getGoalView(userId, saved.id))!;
    expect(reopened.evaluation.criteriaMet).toBe(false);
    expect(reopened.evaluation.criteria[0].sources[0].occurredAt).toBeNull();
    expect(reopened.liveChangedSinceConclusion).toBe(true);
    expect(reopened.status).toBe("CONCLUDED");
    expect(reopened.outcome).toBe("ACHIEVED");
    expect(reopened.version).toBe(concluded.version);
    expect(reopened.conclusionSnapshot).toEqual(snapshot);
    expect(
      reopened.history.find((change) => change.kind === "CONCLUDE"),
    ).toEqual(conclusionHistory);
  });

  it("reuses savings funding and reserve state without making allocations or money", async () => {
    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: "Savings",
        type: "SAVINGS",
        currency: "EUR",
        includeInLiquidSavings: true,
      },
    });
    const saving = await prisma.savingsGoal.create({
      data: {
        userId,
        name: "Equipment",
        currency: "EUR",
        targetAmountMinor: 100000n,
        allocatedAmountMinor: 100000n,
      },
    });
    const criterion: CriterionDraft = {
      key: "funding",
      metric: "SAVINGS_GOAL",
      label: "Equipment funded",
      target: "",
      savingsGoalId: saving.id,
    };
    expect(
      (await evaluateCriterion(prisma, userId, criterion, horizon, at))
        .availability,
    ).toBe("PARTIAL");
    const balance = await prisma.financialAccountBalanceSnapshot.create({
      data: {
        userId,
        accountId: account.id,
        balanceMinor: 200000n,
        reconciledAt: new Date("2026-07-01"),
      },
    });
    expect(
      (await evaluateCriterion(prisma, userId, criterion, horizon, at))
        .availability,
    ).toBe("NOT_CONFIGURED");
    await prisma.financeCurrencyPolicy.create({
      data: { userId, currency: "EUR", protectedReserveMinor: 50000n },
    });
    expect(
      (await evaluateCriterion(prisma, userId, criterion, horizon, at)).reached,
    ).toBe(true);
    await prisma.financialAccountBalanceSnapshot.update({
      where: { id: balance.id },
      data: { balanceMinor: 120000n },
    });
    expect(
      (await evaluateCriterion(prisma, userId, criterion, horizon, at)).reached,
    ).toBe(false);
    expect(
      (await prisma.savingsGoal.findUniqueOrThrow({ where: { id: saving.id } }))
        .allocatedAmountMinor,
    ).toBe(100000n);
    expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
      0,
    );
  });
});
