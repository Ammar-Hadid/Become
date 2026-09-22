import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
import {
  saveAudienceRecord,
  addAudienceToExploration,
} from "./audience.service";
import {
  saveMarketRecord,
  changeNicheDirection,
} from "@/features/entrepreneurship/market/services/market.service";
import {
  logInteraction,
  correctInteraction,
  logBatchOutreach,
} from "@/features/entrepreneurship/interactions/services/interaction.service";
import {
  createProblem,
  recordObservation,
  linkEvidence,
  assessProblem,
  changeProblemAudience,
} from "@/features/entrepreneurship/problems/services/problem.service";
import { correctObservation } from "@/features/entrepreneurship/observations/services/observation.service";
import {
  getProblemDetail,
  evidenceCondition,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { getReachWorkspace } from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import { getAudienceDetail } from "@/features/entrepreneurship/audiences/queries/audience.query";
import { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
import { getExploration } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import {
  saveOfferRevision,
  recordOfferEvent,
  addOfferResponse,
  chooseOfferContinuation,
} from "@/features/entrepreneurship/offers/services/offer.service";
import { getOfferDetail } from "@/features/entrepreneurship/offers/queries/offer.query";
import {
  allocateBusinessReceipt,
  resolveBusinessAllocation,
} from "@/features/finance/business-receipts/services/business-receipt.service";
import { readConversationMeasurement } from "@/features/entrepreneurship/measurements/queries/business-measurement.query";
import { getReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { getTargetedRetrieval } from "@/features/reviews/retrieval/queries/targeted-retrieval.query";

import { getReceiptHandoff } from "@/features/finance/business-receipts/queries/receipt-handoff.query";
const enabled = process.env.RUN_BUSINESS_INTEGRATION === "1";
const day = "2026-09-01";
const window = {
  start: new Date("2026-08-31T22:00:00Z"),
  end: new Date("2026-10-01"),
};
describe.skipIf(!enabled)("Unified audience integrity", () => {
  let userId: string, email: string, foreignId: string, foreignEmail: string;
  beforeEach(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/become_(audience|phase7_)/.test(url.pathname)
    )
      throw Error("Use a dedicated audience test database.");
    email = `audience-${randomUUID()}@example.test`;
    foreignEmail = `audience-${randomUUID()}@example.test`;
    userId = (
      await prisma.user.create({
        data: { email, name: "Disposable audience QA" },
      })
    ).id;
    foreignId = (
      await prisma.user.create({
        data: { email: foreignEmail, name: "Other audience QA" },
      })
    ).id;
  });
  afterEach(async () => {
    if (userId) await deleteDisposableBrowserUser(userId, email);
    if (foreignId) await deleteDisposableBrowserUser(foreignId, foreignEmail);
  });
  const niche = () =>
    saveMarketRecord(userId, "niche", {
      name: "Gaming Mousepad Cleaning & Maintenance",
    });
  const person = (name = "Gamer") =>
    saveAudienceRecord(userId, "person", null, randomUUID(), { name });
  const segment = (name = "Mousepad enthusiasts", marketType = "B2C") =>
    saveAudienceRecord(userId, "segment", null, randomUUID(), {
      name,
      marketType,
      description: `Original definition of ${name}`,
    });
  const conversation = (input: Record<string, unknown> = {}) =>
    logInteraction(userId, randomUUID(), {
      kind: "CONVERSATION",
      channel: "DM",
      occurredAt: day,
      summary: "Discussed mousepad maintenance",
      ...input,
    });
  const observation = (input: Record<string, unknown> = {}) =>
    recordObservation(userId, null, randomUUID(), {
      sourceKind: "DIRECT_OBSERVATION",
      observedAt: day,
      statement: "Cleaning changes the glide",
      sourceDescription: "Observed a before and after trial",
      ...input,
    });
  const quote = {
    title: "Mousepad refresh",
    scope: "One careful cleaning",
    priceBasis: "FIXED",
    amount: "20",
    currency: "EUR",
  };
  async function receipt(currency = "EUR", amountMinor = 3000n) {
    const account = await prisma.financialAccount.create({
      data: { userId, name: randomUUID(), currency, type: "CHECKING" },
    });
    return prisma.financialTransaction.create({
      data: {
        userId,
        accountId: account.id,
        currency,
        amountMinor,
        type: "INCOME",
        inflowKind: "BUSINESS_REVENUE",
        occurredAt: new Date("2026-09-03"),
      },
    });
  }
  it("does not reclassify historical edits or refresh captured segment definitions", async () => {
    const n = await niche(),
      s = await segment();
    const i = await conversation({
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s.id],
    });
    const prior = (await getEvidenceJournal(userId, { nicheId: n.id }))
      .entries[0];
    await prisma.audienceSegment.update({
      where: { id: s.id },
      data: {
        name: "Renamed",
        description: "New definition",
        archivedAt: new Date(),
      },
    });
    await correctInteraction(userId, i.id, randomUUID(), {
      kind: "CONVERSATION",
      channel: "DM",
      occurredAt: day,
      summary: prior.title,
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s.id],
      expectedVersion: 1,
      correctionReason: "Notes only",
      meaningUnchanged: true,
      notes: "Clarified note",
    });
    const kept = (await getEvidenceJournal(userId, { nicheId: n.id }))
      .entries[0];
    expect(kept.audienceContext?.id).toBe(prior.audienceContext?.id);
    expect(kept.audienceContext?.segments[0].nameSnapshot).toBe(
      "Mousepad enthusiasts",
    );
    await expect(
      prisma.audienceContext.update({
        where: { id: prior.audienceContext!.id },
        data: { marketType: "B2B" },
      }),
    ).rejects.toBeDefined();
    const legacy = await prisma.interaction.create({ data: { userId } });
    await prisma.interactionRevision.create({
      data: {
        userId,
        interactionId: legacy.id,
        version: 1,
        kind: "CONVERSATION",
        channel: "DM",
        summary: "Unclassified old wording",
        occurredAt: new Date("2026-08-31T22:00:00Z"),
        nicheId: n.id,
      },
    });
    await correctInteraction(userId, legacy.id, randomUUID(), {
      kind: "CONVERSATION",
      channel: "DM",
      occurredAt: day,
      summary: "Unclassified old wording",
      nicheId: n.id,
      expectedVersion: 1,
      correctionReason: "Notes only",
      meaningUnchanged: true,
      notes: "Corrected note",
    });
    expect(
      (
        await prisma.interactionRevision.findFirstOrThrow({
          where: { interactionId: legacy.id, version: 2 },
        })
      ).audienceContextId,
    ).toBeNull();
    await correctInteraction(userId, legacy.id, randomUUID(), {
      kind: "CONVERSATION",
      channel: "DM",
      occurredAt: day,
      summary: "Unclassified old wording",
      nicheId: n.id,
      expectedVersion: 2,
      correctionReason: "Explicitly recorded uncertainty",
      audienceScopeEdited: true,
      marketType: "UNKNOWN",
      meaningUnchanged: true,
    });
    expect(
      (
        await prisma.interactionRevision.findFirstOrThrow({
          where: { interactionId: legacy.id, version: 3 },
          include: { audienceContext: true },
        })
      ).audienceContext?.marketType,
    ).toBe("UNKNOWN");
  });
  it("commits deferred segments atomically and keeps aggregate samples out of conversations", async () => {
    const n = await niche();
    await expect(
      conversation({
        nicheId: n.id,
        segmentNames: ["Never saved"],
        observations: [
          {
            statement: "Invalid linked problem",
            sourceDescription: "A source",
            problemId: "unowned",
            explanation: "Bad reference",
          },
        ],
      }),
    ).rejects.toThrow("problem you own");
    expect(
      await prisma.audienceSegment.count({
        where: { userId, name: "Never saved" },
      }),
    ).toBe(0);
    const key = randomUUID(),
      input = {
        sourceKind: "DIRECT_OBSERVATION",
        observedAt: day,
        statement: "A survey result",
        sourceDescription: "Responses collected locally",
        identityKind: "GROUP",
        audienceLabel: "Anonymous survey",
        sampleSize: 50,
        segmentNames: ["Local players"],
        nicheId: n.id,
        marketType: "B2C",
      };
    expect(await recordObservation(userId, null, key, input)).toEqual(
      await recordObservation(userId, null, key, input),
    );
    expect(
      await prisma.audienceSegment.count({
        where: { userId, name: "Local players" },
      }),
    ).toBe(1);
    await expect(
      conversation({
        nicheId: n.id,
        identityKind: "GROUP",
        audienceLabel: "Survey",
        sampleSize: 50,
      }),
    ).rejects.toThrow("aggregate findings");
    expect(
      (await getAudienceMetrics(userId, { nicheId: n.id })).peopleContacted,
    ).toBe(0);
  });
  it("starts unknown, keeps mixed evidence and every conclusion independent from work status", async () => {
    const n = await niche();
    expect(n).toMatchObject({
      marketFocus: "UNKNOWN",
      marketConclusion: "UNDECIDED",
    });
    const s = await segment();
    const p = await person();
    const c = await saveMarketRecord(userId, "company", { name: "Arena café" });
    const gamer = await conversation({
      nicheId: n.id,
      marketType: "B2C",
      identityKind: "PERSON",
      personId: p.id,
      segmentIds: [s.id],
      observations: [
        {
          statement: "I wash it every month",
          sourceDescription: "Gamer interview",
        },
      ],
    });
    await conversation({
      nicheId: n.id,
      marketType: "B2C",
      identityKind: "ANONYMOUS",
      audienceLabel: "Unnamed enthusiast",
    });
    await conversation({
      nicheId: n.id,
      marketType: "B2B",
      identityKind: "BUSINESS",
      companyId: c.id,
      personId: p.id,
      participants: [{ personId: p.id, name: "Gamer", role: "Café manager" }],
    });
    await observation({
      nicheId: n.id,
      sourceKind: "PUBLIC_SOURCE",
      sourceUrl: "https://example.com/mousepads",
      marketType: "BOTH",
      identityKind: "GROUP",
      audienceLabel: "Forum maintenance discussion",
      segmentIds: [s.id],
    });
    await observation({
      nicheId: n.id,
      marketType: "B2C",
      identityKind: "GROUP",
      audienceLabel: "Anonymous survey",
      sampleSize: 120,
      sampleUnit: "responses",
      segmentIds: [s.id],
    });
    const journal = await getEvidenceJournal(userId, { nicheId: n.id });
    expect(journal.entries).toHaveLength(5);
    expect(
      journal.entries.find((e) => e.id === gamer.id)?.observations,
    ).toHaveLength(1);
    const metrics = await getAudienceMetrics(userId, { nicheId: n.id });
    expect(metrics).toMatchObject({
      evidenceEntries: 5,
      conversations: 3,
      peopleContacted: 1,
      businessesContacted: 1,
      aggregateSources: 2,
    });
    const key = `INTERACTION:${journal.entries.find((e) => e.id === gamer.id)!.revisionId}`;
    for (const conclusion of ["B2C", "B2B", "BOTH", "NEITHER", "UNDECIDED"]) {
      const current = await getExploration(userId, n.id);
      await changeNicheDirection(userId, n.id, {
        expectedUpdatedAt: current!.updatedAt.toISOString(),
        direction: "EXPLORING",
        marketFocus: "UNKNOWN",
        marketConclusion: conclusion,
        conclusionScope: "Mousepad cleaning customers",
        rationale: `Considering ${conclusion}`,
        sourceKeys: [key],
      });
    }
    const final = await getExploration(userId, n.id);
    expect(final).toMatchObject({
      direction: "EXPLORING",
      marketFocus: "UNKNOWN",
      marketConclusion: "UNDECIDED",
    });
    expect(final!.decisions).toHaveLength(6);
    expect(final!.initialSourceKeys).toEqual([key]);
  });
  it("keeps same-name people distinct, snapshots segment definitions and imports no evidence through membership", async () => {
    const n = await niche();
    const other = await saveMarketRecord(userId, "niche", {
      name: "Another exploration",
    });
    const a = await person("Alex"),
      b = await person("Alex");
    expect(a.id).not.toBe(b.id);
    const s = await segment();
    await conversation({
      nicheId: n.id,
      marketType: "B2C",
      identityKind: "PERSON",
      personId: a.id,
      segmentIds: [s.id],
    });
    await addAudienceToExploration(userId, "person", a.id, other.id);
    await addAudienceToExploration(userId, "segment", s.id, other.id);
    expect(
      (await getAudienceDetail(userId, "segment", s.id, other.id))!.evidence
        .entries,
    ).toHaveLength(0);
    const prior = await prisma.audienceSegment.findUniqueOrThrow({
      where: { id: s.id },
    });
    await saveAudienceRecord(userId, "segment", s.id, randomUUID(), {
      name: "Serious gamers",
      description: "Changed definition",
      marketType: "BOTH",
      expectedUpdatedAt: prior.updatedAt.toISOString(),
    });
    expect(
      (await getEvidenceJournal(userId, { nicheId: n.id })).entries[0]
        .audienceContext!.segments[0],
    ).toMatchObject({
      nameSnapshot: "Mousepad enthusiasts",
      descriptionSnapshot: "Original definition of Mousepad enthusiasts",
    });
    const key = randomUUID(),
      input = { name: "Retry gamer" };
    expect(
      await saveAudienceRecord(userId, "person", null, key, input),
    ).toEqual(await saveAudienceRecord(userId, "person", null, key, input));
    const foreign = await saveAudienceRecord(
      foreignId,
      "segment",
      null,
      randomUUID(),
      { name: "Other account" },
    );
    await expect(
      conversation({
        nicheId: n.id,
        personName: "Must roll back",
        segmentIds: [foreign.id],
      }),
    ).rejects.toThrow("you own");
    expect(
      await prisma.person.count({ where: { userId, name: "Must roll back" } }),
    ).toBe(0);
    await expect(
      prisma.personNiche.create({
        data: { userId: foreignId, personId: a.id, nicheId: n.id },
      }),
    ).rejects.toBeDefined();
  });
  it("preserves source scope, narrower attribution, assessments and concurrent correction protection", async () => {
    const n = await niche(),
      s = await segment();
    const i = await conversation({ nicheId: n.id, marketType: "BOTH" });
    const source = (await getEvidenceJournal(userId, { nicheId: n.id }))
      .entries[0];
    const o = await observation({
      sourceKind: "INTERACTION",
      interactionId: i.id,
      interactionRevisionId: source.revisionId,
      nicheId: n.id,
      audienceOverride: true,
      audienceReason: "The gamer spoke about personal use",
      marketType: "B2C",
      segmentIds: [s.id],
    });
    const p = await createProblem(userId, randomUUID(), {
      title: "Glide degrades",
      initialStatement: "Players struggle with consistency",
      origin: "OBSERVATION_LED",
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s.id],
    });
    const rev = await prisma.observationRevision.findFirstOrThrow({
      where: { observationId: o.id },
    });
    await linkEvidence(userId, p.id, randomUUID(), {
      observationId: o.id,
      observationRevisionId: rev.id,
      stance: "SUPPORTS",
      explanation: "Personal use evidence",
    });
    const evidence = (await getProblemDetail(userId, p.id))!.evidence[0];
    const assessment = await assessProblem(userId, p.id, randomUUID(), {
      state: "SUPPORTED_FOR_SCOPE",
      scope: "Enthusiasts only",
      rationale: "Limited personal evidence",
      assessedAt: day,
      evidenceIds: [evidence.id],
    });
    await changeProblemAudience(userId, p.id, randomUUID(), {
      expectedVersion: 1,
      marketType: "B2B",
      rationale: "Investigate venue maintenance separately",
    });
    const kept = await prisma.problemAssessment.findUniqueOrThrow({
      where: { id: assessment.id },
      include: { audienceRevision: { include: { audienceContext: true } } },
    });
    expect(kept.audienceRevision!.audienceContext!.marketType).toBe("B2C");
    const correction = {
      expectedVersion: 1,
      statement: rev.statement,
      sourceDescription: rev.sourceDescription,
      observedAt: day,
      correctionReason: "Correct audience attribution",
      meaningUnchanged: true,
      audienceOverride: true,
      marketType: "UNKNOWN",
    };
    const results = await Promise.allSettled([
      correctObservation(userId, o.id, randomUUID(), correction),
      correctObservation(userId, o.id, randomUUID(), correction),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      evidenceCondition((await getProblemDetail(userId, p.id))!.evidence[0]),
    ).toBe("REVIEW");
    expect(
      (
        await prisma.interactionRevision.findUniqueOrThrow({
          where: { id: source.revisionId },
          include: { audienceContext: true },
        })
      ).audienceContext!.marketType,
    ).toBe("BOTH");
    const journal = await getEvidenceJournal(userId, { nicheId: n.id });
    expect(journal.entries).toHaveLength(1);
    expect(journal.entries[0].observations).toHaveLength(1);
  });
  it("isolates test recipients and exact terms, supports consumer work and currency-qualified partial receipts", async () => {
    const n = await niche(),
      s = await segment(),
      p = await person();
    const offer = await saveOfferRevision(userId, null, randomUUID(), {
      ...quote,
      mode: "AUDIENCE_TEST",
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s.id],
    });
    const revision = (await getOfferDetail(userId, offer.id))!.revisions[0];
    await recordOfferEvent(userId, offer.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "SHARED",
      occurredAt: day,
      sourceDescription: "Shared in the enthusiast group",
    });
    const a = await addOfferResponse(userId, offer.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "ACCEPTED",
      occurredAt: day,
      sourceDescription: "Direct acceptance",
      identityKind: "PERSON",
      personId: p.id,
      marketType: "B2C",
      segmentIds: [s.id],
    });
    const b = await addOfferResponse(userId, offer.id, randomUUID(), {
      offerRevisionId: revision.id,
      kind: "REJECTED",
      occurredAt: day,
      sourceDescription: "Anonymous reply",
      identityKind: "ANONYMOUS",
      audienceLabel: "Forum reply 2",
      marketType: "B2C",
    });
    await saveOfferRevision(userId, offer.id, randomUUID(), {
      ...quote,
      mode: "AUDIENCE_TEST",
      expectedVersion: 1,
      nicheId: n.id,
      marketType: "BOTH",
      amount: "25",
    });
    const v2 = (await getOfferDetail(userId, offer.id))!.revisions[0];
    await recordOfferEvent(userId, offer.id, randomUUID(), {
      offerRevisionId: v2.id,
      kind: "SHARED",
      occurredAt: day,
      sourceDescription: "New price test",
    });
    const c = await addOfferResponse(userId, offer.id, randomUUID(), {
      offerRevisionId: v2.id,
      kind: "INTERESTED",
      occurredAt: day,
      sourceDescription: "Another response",
      identityKind: "ANONYMOUS",
      audienceLabel: "Forum reply 3",
      marketType: "UNKNOWN",
    });
    await recordOfferEvent(userId, offer.id, randomUUID(), {
      offerRevisionId: v2.id,
      kind: "CLOSED",
      occurredAt: day,
      sourceDescription: "Enough responses for now",
    });
    const detail = (await getOfferDetail(userId, offer.id))!;
    const handoff = await getReceiptHandoff(userId, {
      offer: offer.id,
      engagement: a.id,
      exploration: n.id,
    });
    expect(handoff?.returnPath).toBe(
      `/entrepreneurship/offers/${offer.id}#response-${a.id}`,
    );
    expect(
      await getReceiptHandoff(foreignId, {
        offer: offer.id,
        engagement: a.id,
        exploration: n.id,
      }),
    ).toBeNull();
    expect(detail.engagements).toHaveLength(3);
    expect(
      detail.engagements.find((e) => e.id === a.id)!.events[0],
    ).toMatchObject({ kind: "ACCEPTED", offerRevisionId: revision.id });
    expect(detail.engagements.find((e) => e.id === b.id)!.events[0].kind).toBe(
      "REJECTED",
    );
    expect(
      detail.engagements.find((e) => e.id === c.id)!.events[0].offerRevisionId,
    ).toBe(v2.id);
    await chooseOfferContinuation(userId, offer.id, randomUUID(), {
      engagementId: a.id,
      choice: "LINKED",
      name: "Gamer cleaning work",
    });
    expect(
      (await prisma.offerEngagement.findUniqueOrThrow({ where: { id: a.id } }))
        .workSourceId,
    ).toBeTruthy();
    const t = await receipt();
    const allocationInput = {
        offerRevisionId: revision.id,
        engagementId: a.id,
        amount: "10",
      },
      key = randomUUID();
    const allocation = await allocateBusinessReceipt(
      userId,
      t.id,
      key,
      allocationInput,
    );
    expect(
      await allocateBusinessReceipt(userId, t.id, key, allocationInput),
    ).toEqual(allocation);
    await allocateBusinessReceipt(userId, t.id, randomUUID(), {
      ...allocationInput,
      amount: "5",
    });
    await expect(
      allocateBusinessReceipt(userId, t.id, randomUUID(), {
        ...allocationInput,
        amount: "16",
      }),
    ).rejects.toThrow("exceed");
    const usd = await receipt("USD");
    await allocateBusinessReceipt(userId, usd.id, randomUUID(), {
      nicheId: n.id,
      marketType: "B2C",
      identityKind: "ANONYMOUS",
      audienceLabel: "Walk-in sale",
      amount: "8",
    });
    let metrics = await getAudienceMetrics(userId, { nicheId: n.id });
    expect(metrics.responses).toBe(3);
    expect(metrics.receipts).toEqual([
      { currency: "EUR", amount: "1500", receiptCount: 1 },
      { currency: "USD", amount: "800", receiptCount: 1 },
    ]);
    await resolveBusinessAllocation(
      userId,
      allocation.id,
      "WITHDRAW",
      "Attribution correction",
    );
    metrics = await getAudienceMetrics(userId, { nicheId: n.id });
    expect(metrics.receipts[0].amount).toBe("500");
    await expect(
      addOfferResponse(userId, offer.id, randomUUID(), {
        offerRevisionId: revision.id,
        kind: "ACCEPTED",
        occurredAt: day,
        sourceDescription: "Survey totals",
        identityKind: "GROUP",
        audienceLabel: "20 responses",
        sampleSize: 20,
      }),
    ).rejects.toThrow("aggregate");
    await expect(
      saveOfferRevision(userId, offer.id, randomUUID(), {
        ...quote,
        mode: "AUDIENCE_TEST",
        expectedVersion: 1,
        nicheId: n.id,
      }),
    ).rejects.toThrow("terms changed");
  });
  it("counts identities once across segments and matches outreach by recipient and exploration", async () => {
    const n = await niche(),
      p = await person(),
      s1 = await segment(),
      s2 = await segment("Competitive players");
    await logBatchOutreach(userId, randomUUID(), {
      personIds: [p.id],
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s1.id, s2.id],
      occurredAt: day,
      summary: "Maintenance invitation",
      channel: "DM",
      confirmedSent: true,
    });
    const outreach = (await getReachWorkspace(userId, n.id))!.activity[0];
    await conversation({
      personId: p.id,
      nicheId: n.id,
      marketType: "B2C",
      segmentIds: [s1.id, s2.id],
      respondsToInteractionId: outreach.id,
      occurredAt: "2026-09-02",
      participants: [{ personId: p.id, name: "Gamer" }],
    });
    await conversation({
      personId: p.id,
      nicheId: n.id,
      marketType: "B2B",
      occurredAt: "2026-09-02",
    });
    const measurement = await readConversationMeasurement(prisma, {
      userId,
      ...window,
      distinctCompanies: false,
      distinctPeople: true,
      nicheId: n.id,
    });
    expect(measurement.count).toBe(1);
    expect(measurement.recordCount).toBe(2);
    const linked = await readConversationMeasurement(prisma, {
      userId,
      ...window,
      distinctCompanies: false,
      outreachIds: [outreach.id],
      nicheId: n.id,
    });
    expect(linked.count).toBe(1);
    expect(
      (await getAudienceMetrics(userId, { nicheId: n.id })).peopleContacted,
    ).toBe(1);
    const anon = await logInteraction(userId, randomUUID(), {
      kind: "OUTREACH_SENT",
      channel: "DM",
      occurredAt: day,
      summary: "Unnamed invitation",
      identityKind: "ANONYMOUS",
      audienceLabel: "Forum DM",
      nicheId: n.id,
    });
    await conversation({
      identityKind: "ANONYMOUS",
      audienceLabel: "Forum DM",
      nicheId: n.id,
      respondsToInteractionId: anon.id,
      occurredAt: "2026-09-02",
    });
    expect(
      (
        await readConversationMeasurement(prisma, {
          userId,
          ...window,
          distinctCompanies: false,
          outreachIds: [anon.id],
        })
      ).count,
    ).toBe(1);
    expect(
      (
        await readConversationMeasurement(prisma, {
          userId,
          ...window,
          distinctCompanies: false,
          distinctPeople: true,
          outreachIds: [anon.id],
        })
      ).count,
    ).toBe(0);
  });
  it("provides bounded, user-scoped review retrieval with unknown coverage and source snapshots", async () => {
    const n = await niche(),
      s = await segment(),
      p = await person();
    await conversation({
      nicheId: n.id,
      personId: p.id,
      marketType: "B2C",
      segmentIds: [s.id],
    });
    await observation({
      nicheId: n.id,
      identityKind: "GROUP",
      audienceLabel: "Anonymous survey",
      sampleSize: 1000,
      marketType: "UNKNOWN",
    });
    const legacy = await prisma.interaction.create({ data: { userId } });
    await prisma.interactionRevision.create({
      data: {
        userId,
        interactionId: legacy.id,
        version: 1,
        kind: "CONVERSATION",
        channel: "DM",
        summary: "Historical unclassified conversation",
        occurredAt: new Date("2026-09-02"),
        nicheId: n.id,
      },
    });
    const identity = { timeframe: "month", startOn: "2026-09-01" },
      at = new Date("2026-10-01T12:00:00Z");
    const facts = await getReviewFacts(userId, identity, at, [
      "entrepreneurship",
    ]);
    expect(facts.audience!.summary).toMatchObject({
      evidenceEntries: 3,
      peopleContacted: 1,
      aggregateSources: 1,
    });
    expect(facts.audience!.summary.byMarket.map((r) => r.marketType)).toEqual(
      expect.arrayContaining(["UNKNOWN", "UNRECORDED", "B2C"]),
    );
    const request = {
      type: "ENTREPRENEURSHIP_EVIDENCE",
      ...identity,
      nicheId: n.id,
      segmentId: s.id,
    };
    const retrieved = await getTargetedRetrieval(userId, request, at);
    expect(retrieved.total).toBe(1);
    expect(retrieved.sources[0].audience).toMatchObject({
      version: 1,
      marketType: "B2C",
      personId: p.id,
      segments: [{ id: s.id, name: "Mousepad enthusiasts" }],
    });
    await expect(getTargetedRetrieval(foreignId, request, at)).rejects.toThrow(
      "not found",
    );
    const unknown = await getTargetedRetrieval(
      userId,
      {
        type: "ENTREPRENEURSHIP_EVIDENCE",
        ...identity,
        marketType: "UNRECORDED",
      },
      at,
    );
    expect(unknown.total).toBe(1);
    expect(unknown.sources[0].audience?.classification).toBe("NOT_RECORDED");
    for (let x = 0; x < 25; x++)
      await observation({
        nicheId: n.id,
        statement: `Public note ${x}`,
        marketType: "B2C",
        segmentIds: [s.id],
      });
    const page = await getTargetedRetrieval(userId, request, at);
    expect(page.sources).toHaveLength(25);
    expect(page.total).toBe(26);
    expect(page.nextCursor).toBeTruthy();
    const tail = await getTargetedRetrieval(
      userId,
      { ...request, cursor: page.nextCursor, fingerprint: page.fingerprint },
      at,
    );
    expect(tail.sources).toHaveLength(1);
    await observation({ nicheId: n.id, marketType: "B2C", segmentIds: [s.id] });
    await expect(
      getTargetedRetrieval(
        userId,
        { ...request, cursor: page.nextCursor, fingerprint: page.fingerprint },
        at,
      ),
    ).rejects.toThrow("facts changed");
  });
});
