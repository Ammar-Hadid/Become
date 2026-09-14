import "dotenv/config";
import {
  addCompanyToExploration,
  changeNicheDirection,
} from "@/features/entrepreneurship/market/services/market.service";
import {
  getExplorationSummary,
  getExplorations,
} from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { currentExplorations } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { getOffers } from "@/features/entrepreneurship/offers/queries/offer.query";
import { getProblems } from "@/features/entrepreneurship/problems/queries/problem.query";
import { getMarket } from "@/features/entrepreneurship/market/queries/market.query";
import { linkCompanyWorkSource } from "@/features/entrepreneurship/market/services/company-work-source.service";
import {
  evidenceCompanyCounts,
  getProblemDetail,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import { offerPresentation } from "@/features/entrepreneurship/offers/utils/offer.util";
import { getOfferDetail } from "@/features/entrepreneurship/offers/queries/offer.query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { saveMarketRecord } from "@/features/entrepreneurship/market/services/market.service";
import {
  logInteraction,
  logBatchOutreach,
  correctInteraction,
} from "@/features/entrepreneurship/interactions/services/interaction.service";
import {
  createProblem,
  linkEvidence,
  assessProblem,
  reconfirmEvidence,
} from "@/features/entrepreneurship/problems/services/problem.service";
import { correctObservation } from "@/features/entrepreneurship/observations/services/observation.service";
import {
  chooseOfferContinuation,
  saveOfferRevision,
  recordOfferEvent,
} from "@/features/entrepreneurship/offers/services/offer.service";
import {
  allocateBusinessReceipt,
  resolveBusinessAllocation,
} from "@/features/finance/business-receipts/services/business-receipt.service";
import {
  saveFinancialTransaction,
  deleteFinancialTransaction,
} from "@/features/finance/transactions/services/financial-transaction.service";
import {
  evidenceInclude,
  evidenceCondition,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import { getConfirmedBusinessReceipts } from "@/features/finance/business-receipts/queries/business-receipt.query";
import { getBusinessAttention } from "@/features/entrepreneurship/analytics/queries/business-overview.query";
import { getInteractionJournal } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { replacePaymentAllocations } from "@/features/finance/payments/services/payment-allocation.service";
import {
  saveFollowUp,
  resolveFollowUp,
} from "@/features/entrepreneurship/follow-ups/services/follow-up.service";
import { startSession } from "@/features/sessions/lifecycle/services/start-session.service";
import { completeSession } from "@/features/sessions/lifecycle/services/complete-session.service";

const enabled = process.env.RUN_BUSINESS_INTEGRATION === "1";
describe.skipIf(!enabled)("Phase 4 local PostgreSQL integrity", () => {
  let userId: string;
  beforeEach(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))
      throw new Error("Integration tests require a local database.");
    const user = await prisma.user.create({
      data: {
        name: "Disposable Phase 4 integration",
        email: `phase4-integration-${randomUUID()}@example.com`,
      },
    });
    userId = user.id;
  });
  afterEach(async () => {
    if (!userId) return;
    await prisma.problemAssessmentEvidence.deleteMany({ where: { userId } });
    await prisma.problemAssessment.deleteMany({ where: { userId } });
    await prisma.problemEvidence.deleteMany({ where: { userId } });
    await prisma.businessReceiptAllocation.deleteMany({ where: { userId } });
    await prisma.offerRevisionProblem.deleteMany({ where: { userId } });
    await prisma.offerEvent.deleteMany({ where: { userId } });
    await prisma.followUp.deleteMany({ where: { userId } });
    await prisma.offerRevision.deleteMany({ where: { userId } });
    await prisma.offer.deleteMany({ where: { userId } });
    await prisma.observationRevision.deleteMany({ where: { userId } });
    await prisma.observation.deleteMany({ where: { userId } });
    await prisma.followUp.deleteMany({ where: { userId } });
    await prisma.interactionRevision.deleteMany({ where: { userId } });
    await prisma.interaction.deleteMany({ where: { userId } });
    await prisma.problem.deleteMany({ where: { userId } });
    await prisma.paymentSessionAllocation.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.financialTransaction.deleteMany({ where: { userId } });
    await prisma.financialAccount.deleteMany({ where: { userId } });
    await prisma.companyWorkSource.deleteMany({ where: { userId } });
    await prisma.workSource.deleteMany({ where: { userId } });
    await prisma.companyNiche.deleteMany({ where: { userId } });
    await prisma.nicheDecision.deleteMany({ where: { userId } });
    await prisma.company.deleteMany({ where: { userId } });
    await prisma.niche.deleteMany({ where: { userId } });
    await prisma.businessCapture.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });
  const capture = {
    kind: "CONVERSATION",
    channel: "CALL",
    occurredAt: "2026-09-01",
    summary: "Discussed their weekly handover.",
  };
  it("keeps canonical names and rejects duplicate market records", async () => {
    await saveMarketRecord(userId, "company", { name: "Acme" });
    await expect(
      saveMarketRecord(userId, "company", { name: "  ＡＣＭＥ  " }),
    ).rejects.toBeDefined();
    expect(await prisma.company.count({ where: { userId } })).toBe(1);
  });
  it("rejects stale company edits without changing evidence or losing the saved record", async () => {
    const company = await saveMarketRecord(userId, "company", {
      name: "Original",
    });
    await saveMarketRecord(
      userId,
      "company",
      { name: "Current", expectedUpdatedAt: company.updatedAt.toISOString() },
      company.id,
    );
    await expect(
      saveMarketRecord(
        userId,
        "company",
        {
          name: "Stale edit",
          expectedUpdatedAt: company.updatedAt.toISOString(),
        },
        company.id,
      ),
    ).rejects.toThrow("details changed");
    expect(
      (await prisma.company.findUniqueOrThrow({ where: { id: company.id } }))
        .name,
    ).toBe("Current");
  });
  it("saves the full capture atomically and retries without duplicate effects", async () => {
    const problem = await prisma.problem.create({
      data: {
        userId,
        title: "Slow handover",
        initialStatement: "Weekly handovers may be slow.",
        origin: "USER_HYPOTHESIS",
      },
    });
    const input = {
      ...capture,
      companyName: "Harbor",
      observations: [
        {
          statement: "Friday takes two hours.",
          sourceDescription: "Call with the operations lead",
          problemId: problem.id,
          stance: "SUPPORTS",
          explanation: "A reported time cost; not independently measured.",
        },
      ],
      followUp: { title: "Ask for an example", dueOn: "2026-09-12" },
    };
    const key = randomUUID();
    const results = await Promise.all([
      logInteraction(userId, key, input),
      logInteraction(userId, key, input),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await prisma.company.count({ where: { userId } })).toBe(1);
    expect(await prisma.interaction.count({ where: { userId } })).toBe(1);
    expect(await prisma.observation.count({ where: { userId } })).toBe(1);
    expect(await prisma.problemEvidence.count({ where: { userId } })).toBe(1);
    expect(await prisma.followUp.count({ where: { userId } })).toBe(1);
    await expect(
      logInteraction(userId, key, { ...input, summary: "Different event" }),
    ).rejects.toThrow("already saved");
  });
  it("rolls back company and event when an added problem link is invalid", async () => {
    await expect(
      logInteraction(userId, randomUUID(), {
        ...capture,
        companyName: "Should roll back",
        observations: [
          {
            statement: "Source",
            sourceDescription: "Call",
            problemId: "unowned",
            explanation: "Context",
          },
        ],
      }),
    ).rejects.toThrow();
    expect(await prisma.company.count({ where: { userId } })).toBe(0);
    expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
  });
  it("batch outreach is atomic, idempotent and permits another actual send", async () => {
    const a = await saveMarketRecord(userId, "company", { name: "A" });
    const b = await saveMarketRecord(userId, "company", { name: "B" });
    const input = {
      companyIds: [a.id, b.id],
      occurredAt: "2026-09-01",
      summary: "Sent introduction",
      channel: "EMAIL",
      confirmedSent: true,
    };
    const key = randomUUID();
    await Promise.all([
      logBatchOutreach(userId, key, input),
      logBatchOutreach(userId, key, input),
    ]);
    expect(await prisma.interaction.count({ where: { userId } })).toBe(2);
    await logBatchOutreach(userId, randomUUID(), input);
    expect(await prisma.interaction.count({ where: { userId } })).toBe(4);
  });
  it("rejects wrong-company replies and preserves correction history", async () => {
    const a = await logInteraction(userId, randomUUID(), {
      ...capture,
      companyName: "A",
    });
    await expect(
      logInteraction(userId, randomUUID(), {
        ...capture,
        companyName: "B",
        respondsToInteractionId: a.id,
      }),
    ).rejects.toThrow("same company");
    const b = await logInteraction(userId, randomUUID(), {
      ...capture,
      companyName: "A",
      respondsToInteractionId: a.id,
    });
    await expect(
      correctInteraction(userId, a.id, randomUUID(), {
        ...capture,
        companyName: "A",
        expectedVersion: 1,
        correctionReason: "Reply",
        respondsToInteractionId: b.id,
      }),
    ).rejects.toThrow("loop");
    await correctInteraction(userId, a.id, randomUUID(), {
      ...capture,
      companyName: "A",
      expectedVersion: 1,
      correctionReason: "Extra private note",
      notes: "Remember notebook.",
    });
    const revisions = await prisma.interactionRevision.findMany({
      where: { interactionId: a.id },
      orderBy: { version: "asc" },
    });
    expect(revisions).toHaveLength(2);
    expect(revisions[1].materialChange).toBe(false);
  });
  it("rejects an owned source revision attached to the wrong logical parent", async () => {
    const a = await logInteraction(userId, randomUUID(), capture);
    const b = await logInteraction(userId, randomUUID(), capture);
    const revision = await prisma.interactionRevision.findFirstOrThrow({
      where: { interactionId: a.id },
    });
    const observation = await prisma.observation.create({ data: { userId } });
    await expect(
      prisma.observationRevision.create({
        data: {
          userId,
          observationId: observation.id,
          version: 1,
          kind: "CONTEXT",
          wordingMode: "PARAPHRASE",
          statement: "Source",
          observedAt: new Date(),
          sourceKind: "INTERACTION",
          sourceDescription: "Call",
          interactionId: b.id,
          interactionRevisionId: revision.id,
        },
      }),
    ).rejects.toBeDefined();
  });
  it("keeps logical evidence unique across versions and flags only material corrections", async () => {
    const p = await createProblem(userId, randomUUID(), {
      title: "Handover",
      initialStatement: "Handover may be costly.",
      origin: "USER_HYPOTHESIS",
    });
    await logInteraction(userId, randomUUID(), {
      ...capture,
      observations: [
        {
          statement: "Two hours weekly.",
          sourceDescription: "Call",
          problemId: p.id,
          explanation: "Reported effort",
          stance: "SUPPORTS",
        },
      ],
    });
    const source = await prisma.observation.findFirstOrThrow({
      where: { userId },
      include: { revisions: true },
    });
    const judgment = await assessProblem(userId, p.id, randomUUID(), {
      state: "SUPPORTED_FOR_SCOPE",
      scope: "This one team",
      rationale: "Their account suggests effort",
      assessedAt: "2026-09-01",
      evidenceIds: [
        (await prisma.problemEvidence.findFirstOrThrow({ where: { userId } }))
          .id,
      ],
    });
    await correctObservation(userId, source.id, randomUUID(), {
      expectedVersion: 1,
      statement: "Two hours each week.",
      sourceDescription: "Call",
      observedAt: "2026-09-01",
      correctionReason: "Wording",
      meaningUnchanged: true,
    });
    let evidence = await prisma.problemEvidence.findFirstOrThrow({
      where: { userId },
      include: evidenceInclude,
    });
    expect(evidenceCondition(evidence)).toBe("CURRENT");
    const revision = await prisma.observationRevision.findFirstOrThrow({
      where: { observationId: source.id, version: 2 },
    });
    await expect(
      linkEvidence(userId, p.id, randomUUID(), {
        observationId: source.id,
        observationRevisionId: revision.id,
        stance: "CONTEXT",
        explanation: "Duplicate",
      }),
    ).rejects.toBeDefined();
    await correctObservation(userId, source.id, randomUUID(), {
      expectedVersion: 2,
      statement: "Two minutes weekly.",
      sourceDescription: "Call",
      observedAt: "2026-09-01",
      correctionReason: "Correct unit",
      meaningUnchanged: false,
    });
    evidence = await prisma.problemEvidence.findFirstOrThrow({
      where: { userId },
      include: evidenceInclude,
    });
    expect(evidenceCondition(evidence)).toBe("REVIEW");
    await reconfirmEvidence(userId, p.id, [evidence.id]);
    evidence = await prisma.problemEvidence.findFirstOrThrow({
      where: { userId },
      include: evidenceInclude,
    });
    expect(evidenceCondition(evidence)).toBe("CURRENT");
    const assessment = await prisma.problemAssessment.findUniqueOrThrow({
      where: { id: judgment.id },
    });
    expect(evidenceCondition(evidence, assessment.createdAt)).toBe("REVIEW");
    expect(evidence.observationRevision?.statement).toBe("Two hours weekly.");
  });
  it("rejects same-owner evidence from another problem in an assessment", async () => {
    const a = await createProblem(userId, randomUUID(), {
      title: "A",
      initialStatement: "A claim",
      origin: "USER_HYPOTHESIS",
    });
    const b = await createProblem(userId, randomUUID(), {
      title: "B",
      initialStatement: "B claim",
      origin: "USER_HYPOTHESIS",
    });
    await logInteraction(userId, randomUUID(), {
      ...capture,
      observations: [
        {
          statement: "Source",
          sourceDescription: "Call",
          problemId: a.id,
          explanation: "Context",
        },
      ],
    });
    const evidence = await prisma.problemEvidence.findFirstOrThrow({
      where: { userId },
    });
    await expect(
      assessProblem(userId, b.id, randomUUID(), {
        state: "INCONCLUSIVE",
        scope: "Team",
        rationale: "Unsure",
        assessedAt: "2026-09-01",
        evidenceIds: [evidence.id],
      }),
    ).rejects.toThrow("this problem");
  });
  async function receiptFixture() {
    const company = await saveMarketRecord(userId, "company", {
      name: "Receipt company",
    });
    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: "Disposable checking",
        currency: "EUR",
        type: "CHECKING",
      },
    });
    const input = {
      type: "INCOME",
      inflowKind: "BUSINESS_REVENUE",
      amount: "100.00",
      currency: "EUR",
      accountId: account.id,
      occurredAt: "2026-09-01T12:00",
    };
    const receipt = await saveFinancialTransaction(userId, input);
    return { company, account, input, receipt };
  }
  it("serializes concurrent allocations so the receipt is never overallocated", async () => {
    const { company, receipt } = await receiptFixture();
    const results = await Promise.allSettled([
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: company.id,
        amount: "70",
      }),
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: company.id,
        amount: "70",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        await prisma.businessReceiptAllocation.aggregate({
          where: { userId, withdrawnAt: null },
          _sum: { amountMinor: true },
        })
      )._sum.amountMinor,
    ).toBe(7000n);
  });
  it("serializes allocation against transaction amount corrections", async () => {
    const { company, receipt, input } = await receiptFixture();
    await Promise.allSettled([
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: company.id,
        amount: "80",
      }),
      saveFinancialTransaction(userId, { ...input, amount: "50" }, receipt.id),
    ]);
    const transaction = await prisma.financialTransaction.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    const allocations = await prisma.businessReceiptAllocation.aggregate({
      where: { userId, transactionId: receipt.id, withdrawnAt: null },
      _sum: { amountMinor: true },
    });
    expect(allocations._sum.amountMinor ?? 0n).toBeLessThanOrEqual(
      transaction.amountMinor,
    );
  });
  it("serializes allocation against deletion and preserves withdrawn history", async () => {
    const { company, receipt } = await receiptFixture();
    await Promise.allSettled([
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: company.id,
        amount: "60",
      }),
      deleteFinancialTransaction(userId, receipt.id),
    ]);
    expect(
      await prisma.financialTransaction.count({ where: { id: receipt.id } }),
    ).toBe(0);
    expect(
      await prisma.businessReceiptAllocation.count({
        where: { userId, withdrawnAt: null },
      }),
    ).toBe(0);
    const retained = await prisma.businessReceiptAllocation.findMany({
      where: { userId },
    });
    expect(
      retained.every(
        (allocation) =>
          allocation.transactionId === null && allocation.withdrawnAt,
      ),
    ).toBe(true);
  });
  it("requires receipt review after material edits, but not unrelated notes", async () => {
    const { company, receipt, input } = await receiptFixture();
    const key = randomUUID();
    await allocateBusinessReceipt(userId, receipt.id, key, {
      companyId: company.id,
      amount: "100",
    });
    await allocateBusinessReceipt(userId, receipt.id, key, {
      companyId: company.id,
      amount: "100",
    });
    await saveFinancialTransaction(
      userId,
      { ...input, notes: "Editorial note" },
      receipt.id,
    );
    expect(
      (
        await prisma.businessReceiptAllocation.findUniqueOrThrow({
          where: { id: key },
        })
      ).needsReviewAt,
    ).toBeNull();
    await saveFinancialTransaction(
      userId,
      { ...input, occurredAt: "2026-09-02T12:00" },
      receipt.id,
    );
    expect(
      await getConfirmedBusinessReceipts(
        userId,
        new Date("2026-09-01"),
        new Date("2026-10-01"),
      ),
    ).toHaveLength(0);
    await resolveBusinessAllocation(userId, key, "RECONFIRM", "");
    expect(
      (
        await getConfirmedBusinessReceipts(
          userId,
          new Date("2026-09-01"),
          new Date("2026-10-01"),
        )
      )[0].amount,
    ).toBe("10000");
    await expect(
      saveFinancialTransaction(
        userId,
        { ...input, inflowKind: "GIFT" },
        receipt.id,
      ),
    ).rejects.toThrow("Withdraw or correct");
  });
  it("preserves recurring quotes and rejects wrong-offer revisions and wrong-company receipt attribution", async () => {
    const { company, receipt } = await receiptFixture();
    const input = {
      companyId: company.id,
      title: "Weekly operations",
      scope: "Maintain their workflow",
      amount: "300",
      currency: "EUR",
      priceBasis: "RECURRING",
      intervalUnit: "MONTH",
      intervalCount: 1,
    };
    const a = await saveOfferRevision(userId, null, randomUUID(), input);
    const b = await saveOfferRevision(userId, null, randomUUID(), {
      ...input,
      title: "Other offer",
    });
    const revision = await prisma.offerRevision.findFirstOrThrow({
      where: { offerId: a.id },
    });
    await expect(
      recordOfferEvent(userId, b.id, randomUUID(), {
        offerRevisionId: revision.id,
        kind: "PROPOSED",
        occurredAt: "2026-09-01",
        sourceDescription: "Sent quote",
      }),
    ).rejects.toThrow("this offer");
    await recordOfferEvent(userId, a.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "PROPOSED",
      occurredAt: "2026-09-01",
      sourceDescription: "Sent quote",
    });
    await recordOfferEvent(userId, a.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "ACCEPTED",
      occurredAt: "2026-09-02",
      sourceDescription: "Accepted by phone",
    });
    expect(
      (await getBusinessAttention(userId)).some((item) => item.id === a.id),
    ).toBe(true);
    await recordOfferEvent(userId, a.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "CANCELLED",
      occurredAt: "2026-09-03",
      sourceDescription: "Company cancelled the pilot",
    });
    expect(
      (await getBusinessAttention(userId)).some((item) => item.id === a.id),
    ).toBe(false);
    await saveOfferRevision(userId, a.id, randomUUID(), {
      ...input,
      amount: "500",
    });
    expect(
      (
        await prisma.offerRevision.findUniqueOrThrow({
          where: { id: revision.id },
        })
      ).priceMinor,
    ).toBe(30000n);
    const other = await saveMarketRecord(userId, "company", {
      name: "Other payer",
    });
    await expect(
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: other.id,
        offerRevisionId: revision.id,
        amount: "10",
      }),
    ).rejects.toThrow("receipt recipient");
  });
  it("keeps accepted-but-unpaid work continuation explicit and honors Not now", async () => {
    const { company } = await receiptFixture();
    const offer = await saveOfferRevision(userId, null, randomUUID(), {
      companyId: company.id,
      title: "Pilot",
      scope: "Four weeks",
      priceBasis: "FIXED",
      amount: "150",
      currency: "EUR",
    });
    const revision = await prisma.offerRevision.findFirstOrThrow({
      where: { offerId: offer.id },
    });
    for (const kind of ["PROPOSED", "ACCEPTED"])
      await recordOfferEvent(userId, offer.id, randomUUID(), {
        offerRevisionId: revision.id,
        kind,
        occurredAt: "2026-09-01",
        sourceDescription: "Explicit test outcome",
      });
    expect(
      await prisma.businessReceiptAllocation.count({ where: { userId } }),
    ).toBe(0);
    await chooseOfferContinuation(userId, offer.id, randomUUID(), {
      choice: "NOT_NOW",
    });
    expect(
      (await getBusinessAttention(userId)).some((item) => item.id === offer.id),
    ).toBe(false);
    await chooseOfferContinuation(userId, offer.id, randomUUID(), {
      choice: "NOT_NEEDED",
    });
    expect(await prisma.workSource.count({ where: { userId } })).toBe(0);
    const key = randomUUID();
    await chooseOfferContinuation(userId, offer.id, key, {
      choice: "LINKED",
      name: "Pilot client",
    });
    await chooseOfferContinuation(userId, offer.id, key, {
      choice: "LINKED",
      name: "Pilot client",
    });
    const source = await prisma.workSource.findFirstOrThrow({
      where: { userId },
    });
    await chooseOfferContinuation(userId, offer.id, randomUUID(), {
      choice: "LINKED",
      workSourceId: source.id,
    });
    expect(await prisma.workSource.count({ where: { userId } })).toBe(1);
    expect(await prisma.companyWorkSource.count({ where: { userId } })).toBe(1);
  });
  it("keeps split deposits and installments exact, separated by payment period and currency", async () => {
    const { company, receipt, input } = await receiptFixture();
    const secondCompany = await saveMarketRecord(userId, "company", {
      name: "Second recipient",
    });
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: company.id,
      amount: "40",
    });
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: secondCompany.id,
      amount: "60",
    });
    const installment = await saveFinancialTransaction(userId, {
      ...input,
      amount: "50",
      occurredAt: "2026-09-02T12:00",
    });
    await allocateBusinessReceipt(userId, installment.id, randomUUID(), {
      companyId: company.id,
      amount: "50",
    });
    const usdAccount = await prisma.financialAccount.create({
      data: { userId, name: "USD fixture", type: "CHECKING", currency: "USD" },
    });
    const dollars = await saveFinancialTransaction(userId, {
      ...input,
      accountId: usdAccount.id,
      currency: "USD",
      amount: "75",
    });
    await allocateBusinessReceipt(userId, dollars.id, randomUUID(), {
      companyId: company.id,
      amount: "75",
    });
    const totals = await getConfirmedBusinessReceipts(
      userId,
      new Date("2026-09-01"),
      new Date("2026-10-01"),
    );
    expect(totals.find((row) => row.currency === "EUR")?.amount).toBe("15000");
    expect(totals.find((row) => row.currency === "USD")?.amount).toBe("7500");
    const beforeInstallment = await getConfirmedBusinessReceipts(
      userId,
      new Date("2026-09-01"),
      new Date("2026-09-02"),
    );
    expect(
      beforeInstallment.find((row) => row.currency === "EUR")?.amount,
    ).toBe("10000");
  });
  it("retains explicit follow-ups and source history when a company is archived", async () => {
    const company = await saveMarketRecord(userId, "company", {
      name: "Archive fixture",
    });
    const interaction = await logInteraction(userId, randomUUID(), {
      ...capture,
      companyId: company.id,
    });
    const follow = await saveFollowUp(
      userId,
      { companyId: company.id },
      null,
      randomUUID(),
      { title: "Check the pilot", dueOn: "2026-09-01" },
    );
    await prisma.company.update({
      where: { id: company.id },
      data: { archivedAt: new Date() },
    });
    expect(
      (await getBusinessAttention(userId)).some(
        (item) => item.id === follow.id,
      ),
    ).toBe(true);
    expect(
      await prisma.interactionRevision.count({
        where: { interactionId: interaction.id },
      }),
    ).toBe(1);
    await expect(
      logInteraction(userId, randomUUID(), {
        ...capture,
        companyId: company.id,
      }),
    ).rejects.toThrow("active company");
    await resolveFollowUp(userId, follow.id, "COMPLETE");
    expect(
      (await getBusinessAttention(userId)).some(
        (item) => item.id === follow.id,
      ),
    ).toBe(false);
    await resolveFollowUp(userId, follow.id, "REOPEN");
    expect(
      (await getBusinessAttention(userId)).some(
        (item) => item.id === follow.id,
      ),
    ).toBe(true);
  });
  it("keeps session and company attribution as two dimensions of the same €100", async () => {
    const { company, receipt, input } = await receiptFixture();
    await saveFinancialTransaction(
      userId,
      { ...input, inflowKind: "EARNED_WORK" },
      receipt.id,
    );
    await ensureDefaultDomains(userId);
    const activity = await prisma.activityType.findFirstOrThrow({
      where: {
        domain: { userId, slug: "finance" },
        financeActivityKind: "PAID_WORK",
      },
    });
    const session = await prisma.session.create({
      data: {
        userId,
        domainId: activity.domainId,
        activityTypeId: activity.id,
        financeActivityKind: "PAID_WORK",
        startedAt: new Date("2026-09-01T10:00Z"),
        endedAt: new Date("2026-09-01T11:00Z"),
      },
    });
    await replacePaymentAllocations(
      userId,
      receipt.id,
      [{ sessionId: session.id, amount: "100" }],
      "yes",
    );
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: company.id,
      amount: "100",
    });
    expect(
      (
        await prisma.financialTransaction.aggregate({
          where: { userId },
          _sum: { amountMinor: true },
        })
      )._sum.amountMinor,
    ).toBe(10000n);
    expect(
      (
        await getConfirmedBusinessReceipts(
          userId,
          new Date("2026-09-01"),
          new Date("2026-10-01"),
        )
      )[0].amount,
    ).toBe("10000");
  });
  it("snapshots session context, preserves authoritative completion and creates no contact automatically", async () => {
    await ensureDefaultDomains(userId);
    const company = await saveMarketRecord(userId, "company", {
      name: "Before rename",
    });
    const activity = await prisma.activityType.findFirstOrThrow({
      where: { domain: { userId, slug: "entrepreneurship" }, slug: "delivery" },
    });
    const started = await startSession(userId, {
      domainId: activity.domainId,
      activityTypeId: activity.id,
      businessCompanyId: company.id,
      description: null,
    });
    if (started.status !== "created") throw new Error("Session did not start");
    await saveMarketRecord(
      userId,
      "company",
      {
        name: "After rename",
        expectedUpdatedAt: company.updatedAt.toISOString(),
      },
      company.id,
    );
    const first = await completeSession(userId, started.sessionId, {
      outcome: "Delivered a pilot",
      notes: null,
    });
    const retry = await completeSession(userId, started.sessionId, {
      outcome: "Different retry value",
      notes: null,
    });
    if (first.status !== "completed" || retry.status !== "completed")
      throw new Error("Completion failed");
    expect(retry.session).toEqual(first.session);
    expect(first.session.businessCompanySnapshot).toBe("Before rename");
    expect(first.session.entrepreneurshipActivityKind).toBe("CLIENT_DELIVERY");
    expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
    const manual = await logInteraction(userId, randomUUID(), {
      ...capture,
      sourceSessionId: started.sessionId,
      observations: [
        {
          kind: "CONTEXT",
          wordingMode: "PARAPHRASE",
          statement: "Reviewed the pilot together.",
          sourceDescription: "Joint handover call",
        },
      ],
    });
    await correctInteraction(userId, manual.id, randomUUID(), {
      ...capture,
      summary: "Discussed the pilot handover.",
      expectedVersion: 1,
      correctionReason: "Clarify the wording",
      meaningUnchanged: true,
    });
    const corrected = await prisma.interactionRevision.findFirstOrThrow({
      where: { interactionId: manual.id, version: 2 },
    });
    expect(corrected.sourceSessionId).toBe(started.sessionId);
    const journal = await getInteractionJournal(userId);
    expect(
      journal.records[0].revisions.flatMap((revision) => revision.observations),
    ).toHaveLength(1);
  });
  it("company linking creates or reuses a WorkSource without attributing income history", async () => {
    const { company } = await receiptFixture();
    const key = randomUUID();
    await linkCompanyWorkSource(userId, company.id, key, {
      name: "Connected client",
    });
    await linkCompanyWorkSource(userId, company.id, key, {
      name: "Connected client",
    });
    const source = await prisma.workSource.findFirstOrThrow({
      where: { userId },
    });
    const other = await saveMarketRecord(userId, "company", {
      name: "Second relationship",
    });
    await linkCompanyWorkSource(userId, other.id, randomUUID(), {
      workSourceId: source.id,
    });
    expect(await prisma.workSource.count({ where: { userId } })).toBe(1);
    expect(await prisma.companyWorkSource.count({ where: { userId } })).toBe(2);
    expect(
      await prisma.businessReceiptAllocation.count({ where: { userId } }),
    ).toBe(0);
    await expect(
      linkCompanyWorkSource(userId, other.id, randomUUID(), {
        workSourceId: "missing",
      }),
    ).rejects.toThrow("existing WorkSource");
  });
  it("centers accepted historical terms, atomically captures outcome observations and retains cancellation history", async () => {
    const company = await saveMarketRecord(userId, "company", {
      name: "Accepted company",
    });
    const terms = {
      companyId: company.id,
      title: "Monthly pilot",
      scope: "Monthly support",
      priceBasis: "RECURRING",
      intervalUnit: "MONTH",
      intervalCount: 1,
      currency: "EUR",
      amount: "150",
    };
    const offer = await saveOfferRevision(userId, null, randomUUID(), terms);
    const revision = await prisma.offerRevision.findFirstOrThrow({
      where: { offerId: offer.id },
    });
    const event = {
      offerRevisionId: revision.id,
      occurredAt: "2026-09-01",
      sourceDescription: "Explicit customer reply",
    };
    await recordOfferEvent(userId, offer.id, randomUUID(), {
      ...event,
      kind: "PROPOSED",
    });
    await saveOfferRevision(userId, offer.id, randomUUID(), {
      ...terms,
      amount: "175",
    });
    const key = randomUUID();
    const outcome = {
      ...event,
      kind: "ACCEPTED",
      observations: [
        {
          statement: "We can start next week",
          sourceDescription: "Customer phone acceptance",
          kind: "COMMITMENT",
        },
      ],
    };
    await recordOfferEvent(userId, offer.id, key, outcome);
    await recordOfferEvent(userId, offer.id, key, outcome);
    const detail = (await getOfferDetail(userId, offer.id))!;
    expect(
      offerPresentation(detail.revisions, detail.events).quote.priceMinor,
    ).toBe(15000n);
    expect(await prisma.observation.count({ where: { userId } })).toBe(1);
    expect(await prisma.financialTransaction.count({ where: { userId } })).toBe(
      0,
    );
    expect(await prisma.workSource.count({ where: { userId } })).toBe(0);
    await expect(
      recordOfferEvent(userId, offer.id, randomUUID(), {
        ...event,
        kind: "CANCELLED",
        observations: [
          {
            statement: "Explicit change",
            sourceDescription: "Call",
            problemId: "missing",
            explanation: "test",
          },
        ],
      }),
    ).rejects.toThrow("Observation 1");
    expect(
      await prisma.offerEvent.count({ where: { userId, kind: "CANCELLED" } }),
    ).toBe(0);
    await recordOfferEvent(userId, offer.id, randomUUID(), {
      ...event,
      kind: "CANCELLED",
    });
    const cancelled = (await getOfferDetail(userId, offer.id))!;
    expect(
      offerPresentation(cancelled.revisions, cancelled.events),
    ).toMatchObject({ status: "CANCELLED", quote: { priceMinor: 15000n } });
    expect(await prisma.observation.count({ where: { userId } })).toBe(1);
  });
  it("counts distinct companies across repeated and mixed-stance observations, excluding changed sources", async () => {
    const problem = await createProblem(userId, randomUUID(), {
      title: "Phone calls",
      initialStatement: "Repeated calls cost time",
      origin: "USER_HYPOTHESIS",
    });
    const a = await saveMarketRecord(userId, "company", { name: "Company A" });
    const b = await saveMarketRecord(userId, "company", { name: "Company B" });
    const observation = (stance: string) => ({
      statement: "An explicit observation",
      sourceDescription: "Customer call",
      problemId: problem.id,
      stance,
      explanation: "Scoped interpretation",
    });
    const input = {
      ...capture,
      companyId: a.id,
      participants: [
        { name: "Alex", role: "Operations", email: "alex@example.com" },
        { name: "Sam", role: "Owner" },
      ],
      observations: [
        observation("SUPPORTS"),
        observation("SUPPORTS"),
        observation("SUPPORTS"),
        observation("CONTRADICTS"),
      ],
    };
    await expect(
      logInteraction(userId, randomUUID(), {
        ...input,
        observations: [
          input.observations[0],
          { ...input.observations[1], explanation: "" },
          input.observations[2],
        ],
      }),
    ).rejects.toBeDefined();
    expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
    const key = randomUUID();
    await logInteraction(userId, key, input);
    await logInteraction(userId, key, input);
    await logInteraction(userId, randomUUID(), {
      ...capture,
      companyId: b.id,
      observations: [observation("SUPPORTS")],
    });
    expect(
      evidenceCompanyCounts(
        (await getProblemDetail(userId, problem.id))!.evidence,
      ),
    ).toMatchObject({ total: 2, supporting: 2, contradicting: 1, sources: 5 });
    const source = await prisma.observationRevision.findFirstOrThrow({
      where: { userId, companyId: b.id },
    });
    await prisma.observation.update({
      where: { id: source.observationId },
      data: { voidedAt: new Date() },
    });
    expect(
      evidenceCompanyCounts(
        (await getProblemDetail(userId, problem.id))!.evidence,
      ),
    ).toMatchObject({ total: 1, supporting: 1, contradicting: 1, sources: 4 });
  });
  it("resolves recipient overrides once, distinguishes cleared notes, and rolls back invalid batches", async () => {
    const a = await saveMarketRecord(userId, "company", {
      name: "Shared recipient",
    });
    const b = await saveMarketRecord(userId, "company", {
      name: "Override recipient",
    });
    const input = {
      companyIds: [a.id, b.id, a.id],
      occurredAt: "2026-09-01",
      channel: "EMAIL",
      summary: "Shared introduction",
      notes: "Shared source notes",
      confirmedSent: true,
      overrides: {
        [b.id]: {
          summary: "Individual introduction",
          channel: "DM",
          notes: "",
        },
      },
    };
    await expect(
      logBatchOutreach(userId, randomUUID(), {
        ...input,
        overrides: { [b.id]: { summary: "" } },
      }),
    ).rejects.toThrow("Override recipient · summary");
    expect(await prisma.interaction.count({ where: { userId } })).toBe(0);
    const key = randomUUID();
    await logBatchOutreach(userId, key, input);
    await logBatchOutreach(userId, key, input);
    const rows = await prisma.interactionRevision.findMany({
      where: { userId },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.companyId === a.id)).toMatchObject({
      summary: "Shared introduction",
      channel: "EMAIL",
      notes: "Shared source notes",
    });
    expect(rows.find((r) => r.companyId === b.id)).toMatchObject({
      summary: "Individual introduction",
      channel: "DM",
      notes: null,
    });
  });
  it("splits one receipt across quoted offers with installments, atomic over-allocation and correction history", async () => {
    const { company, receipt, input } = await receiptFixture();
    const revisions = [];
    for (const title of ["Deposit for pilot", "Monthly support"]) {
      const offer = await saveOfferRevision(userId, null, randomUUID(), {
        companyId: company.id,
        title,
        scope: "An explicit service",
        priceBasis: "FIXED",
        amount: "100",
        currency: "EUR",
      });
      const revision = await prisma.offerRevision.findFirstOrThrow({
        where: { offerId: offer.id },
      });
      await recordOfferEvent(userId, offer.id, randomUUID(), {
        offerRevisionId: revision.id,
        kind: "PROPOSED",
        occurredAt: "2026-09-01",
        sourceDescription: "Sent these quoted terms",
      });
      revisions.push(revision);
    }
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: company.id,
      offerRevisionId: revisions[0].id,
      amount: "25",
    });
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: company.id,
      offerRevisionId: revisions[1].id,
      amount: "50",
    });
    await expect(
      allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
        companyId: company.id,
        offerRevisionId: revisions[0].id,
        amount: "25.01",
      }),
    ).rejects.toThrow("exceed");
    expect(
      await prisma.businessReceiptAllocation.count({ where: { userId } }),
    ).toBe(2);
    await allocateBusinessReceipt(userId, receipt.id, randomUUID(), {
      companyId: company.id,
      offerRevisionId: revisions[0].id,
      amount: "25",
    });
    const installment = await saveFinancialTransaction(userId, {
      ...input,
      amount: "50",
      occurredAt: "2026-09-02T12:00",
    });
    await allocateBusinessReceipt(userId, installment.id, randomUUID(), {
      companyId: company.id,
      offerRevisionId: revisions[1].id,
      amount: "50",
    });
    expect(
      (
        await getConfirmedBusinessReceipts(
          userId,
          new Date("2026-09-01"),
          new Date("2026-10-01"),
        )
      )[0],
    ).toMatchObject({ amount: "15000", receiptCount: 2 });
    await saveFinancialTransaction(
      userId,
      { ...input, occurredAt: "2026-09-03T12:00" },
      receipt.id,
    );
    expect(
      await prisma.businessReceiptAllocation.count({
        where: { userId, needsReviewAt: { not: null } },
      }),
    ).toBe(3);
    await deleteFinancialTransaction(userId, receipt.id);
    expect(
      await prisma.businessReceiptAllocation.count({
        where: { userId, withdrawnAt: { not: null }, transactionId: null },
      }),
    ).toBe(3);
    expect(
      (
        await getConfirmedBusinessReceipts(
          userId,
          new Date("2026-09-01"),
          new Date("2026-10-01"),
        )
      )[0].amount,
    ).toBe("5000");
  });

  it("queries the entire canonical company dataset with independently archived niches and owned cursors", async () => {
    await prisma.company.createMany({
      data: Array.from({ length: 112 }, (_, index) => ({
        userId,
        name: `Company ${index}`,
        normalizedName: `company ${index}`,
      })),
    });
    await prisma.niche.create({
      data: {
        userId,
        name: "Archived niche",
        normalizedName: "archived niche",
        archivedAt: new Date(),
      },
    });
    const result = await getMarket(
      userId,
      "  ＣＯＭＰＡＮＹ 111  ",
      false,
      undefined,
      true,
    );
    expect(result.companyCount).toBe(1);
    expect(result.companies[0].name).toBe("Company 111");
    expect(result.niches).toHaveLength(1);
    const active = await getMarket(userId, "", false, undefined, false);
    expect(active.companyCount).toBe(112);
    expect(active.niches).toHaveLength(0);
    const filtered = await getMarket(
      userId,
      "Company 111",
      false,
      "wrong-cursor",
      false,
    );
    expect(filtered.companies).toHaveLength(1);
    expect(filtered.companies[0].id).toBe(result.companies[0].id);
  });

  it("starts, pauses, stops and resumes explorations without leaking shared-company history", async () => {
    expect(
      currentExplorations(await getExplorations(userId)).current,
    ).toBeUndefined();
    const dentists = await saveMarketRecord(userId, "niche", {
      name: "Dentists",
      scope: "Administrative automation",
    });
    const company = await saveMarketRecord(userId, "company", {
      name: "Shared practice",
      nicheIds: [dentists.id],
    });
    const problem = await createProblem(userId, randomUUID(), {
      title: "Administration",
      initialStatement: "Repetitive administration",
      origin: "USER_HYPOTHESIS",
      nicheId: dentists.id,
    });
    const interaction = await logInteraction(userId, randomUUID(), {
      ...capture,
      companyId: company.id,
      nicheId: dentists.id,
      observations: [
        {
          statement: "Too much copying",
          sourceDescription: "Customer interview",
          problemId: problem.id,
          stance: "SUPPORTS",
          explanation: "Reported time cost",
        },
      ],
    });
    const terms = {
      companyId: company.id,
      title: "Administrative pilot",
      scope: "An appointment pilot",
      priceBasis: "FIXED",
      amount: "100",
      currency: "EUR",
      nicheId: dentists.id,
    };
    const offer = await saveOfferRevision(userId, null, randomUUID(), terms);
    expect(await getExplorationSummary(userId, dentists.id)).toMatchObject({
      companies: 1,
      interactions: 1,
      problems: 1,
      offers: 1,
      conversations: 1,
    });
    expect(currentExplorations(await getExplorations(userId)).current?.id).toBe(
      dentists.id,
    );
    await changeNicheDirection(userId, dentists.id, {
      direction: "PAUSED",
      rationale: "Take time to think",
      expectedUpdatedAt: dentists.updatedAt.toISOString(),
    });
    expect(
      currentExplorations(await getExplorations(userId)).past.map((n) => n.id),
    ).toContain(dentists.id);
    const barbers = await saveMarketRecord(userId, "niche", {
      name: "Barbers",
    });
    expect(currentExplorations(await getExplorations(userId)).current?.id).toBe(
      barbers.id,
    );
    expect(await getExplorationSummary(userId, barbers.id)).toMatchObject({
      companies: 0,
      interactions: 0,
      problems: 0,
      offers: 0,
      seconds: 0,
    });
    await addCompanyToExploration(userId, barbers.id, company.id);
    await addCompanyToExploration(userId, barbers.id, company.id);
    expect(
      await prisma.companyNiche.count({
        where: { userId, companyId: company.id },
      }),
    ).toBe(2);
    expect(await getExplorationSummary(userId, barbers.id)).toMatchObject({
      companies: 1,
      interactions: 0,
      problems: 0,
      offers: 0,
    });
    expect(
      (await getMarket(userId, "", false, undefined, false, barbers.id))
        .companies[0].id,
    ).toBe(company.id);
    expect(
      (await getInteractionJournal(userId, { nicheId: barbers.id })).records,
    ).toHaveLength(0);
    expect(
      (await getProblems(userId, undefined, false, barbers.id)).records,
    ).toHaveLength(0);
    expect(
      (await getOffers(userId, undefined, false, barbers.id)).records,
    ).toHaveLength(0);
    expect((await getOffers(userId)).records).toHaveLength(1);
    expect((await getInteractionJournal(userId)).records[0].id).toBe(
      interaction.id,
    );
    // A later revision in a different workspace never silently changes the original offer context.
    await saveOfferRevision(userId, offer.id, randomUUID(), {
      ...terms,
      nicheId: barbers.id,
      amount: "125",
    });
    expect(
      (await getOffers(userId, undefined, false, barbers.id)).records,
    ).toHaveLength(0);
    await changeNicheDirection(userId, dentists.id, {
      direction: "STOPPED",
      rationale: "Not pursuing now",
    });
    await changeNicheDirection(userId, dentists.id, {
      direction: "EXPLORING",
      rationale: "Revisit the administrative question",
    });
    expect(currentExplorations(await getExplorations(userId)).current?.id).toBe(
      dentists.id,
    );
    expect(
      (await getExplorationSummary(userId, dentists.id)).interactions,
    ).toBe(1);
    await expect(
      changeNicheDirection(userId, dentists.id, {
        direction: "STOPPED",
        rationale: "Stale decision",
        expectedUpdatedAt: dentists.updatedAt.toISOString(),
      }),
    ).rejects.toThrow("changed");
  });
  it("retains explicit niche snapshots for batch outreach and rejects unowned offer context atomically", async () => {
    const niche = await saveMarketRecord(userId, "niche", { name: "Dentists" });
    const company = await saveMarketRecord(userId, "company", {
      name: "Practice",
    });
    await logBatchOutreach(userId, randomUUID(), {
      companyIds: [company.id],
      nicheId: niche.id,
      channel: "EMAIL",
      occurredAt: "2026-09-01",
      summary: "Asked about administration",
      confirmedSent: true,
    });
    expect(
      (await getInteractionJournal(userId, { nicheId: niche.id })).records[0]
        .revisions[0],
    ).toMatchObject({ nicheId: niche.id, nicheSnapshot: "Dentists" });
    await expect(
      saveOfferRevision(userId, null, randomUUID(), {
        companyId: company.id,
        title: "Invalid context",
        scope: "Pilot",
        priceBasis: "FIXED",
        nicheId: "not-owned",
      }),
    ).rejects.toThrow("own");
    expect(await prisma.offer.count({ where: { userId } })).toBe(0);
    await expect(
      addCompanyToExploration(userId, niche.id, "not-owned"),
    ).rejects.toThrow("own");
    // Editing the niche label doesn't move its decision-based position or rewrite the batch snapshot.
    const initialDecision = (await getExplorations(userId))[0].decisions[0]
      .createdAt;
    await saveMarketRecord(
      userId,
      "niche",
      {
        name: "Dental practices",
        expectedUpdatedAt: niche.updatedAt.toISOString(),
      },
      niche.id,
    );
    expect((await getExplorations(userId))[0].decisions[0].createdAt).toEqual(
      initialDecision,
    );
    expect(
      (await getInteractionJournal(userId, { nicheId: niche.id })).records[0]
        .revisions[0].nicheSnapshot,
    ).toBe("Dentists");
  });
});
