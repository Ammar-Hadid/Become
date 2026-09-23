import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/nexo/adapters/openai.adapter", () => ({
  executeOpenAiTask: vi.fn(),
}));
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { executeOpenAiTask } from "@/features/nexo/adapters/openai.adapter";
import { searchBusinessRecords } from "@/features/entrepreneurship/shared/queries/business-record-search.query";
import {
  getReachWorkspace,
  getReachActivityDetail,
} from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import {
  getConversationDebriefMessages,
  getConversationPage,
  getConversationWorkspace,
} from "@/features/entrepreneurship/conversations/queries/conversation.query";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import {
  recordObservation,
  createProblem,
  linkEvidence,
  assessProblem,
  withdrawEvidence,
} from "@/features/entrepreneurship/problems/services/problem.service";
import { problemExplorationWhere } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { saveOfferRevision } from "@/features/entrepreneurship/offers/services/offer.service";
import { getOffers } from "@/features/entrepreneurship/offers/queries/offer.query";
import { correctObservation } from "@/features/entrepreneurship/observations/services/observation.service";
import { readSynthesisContext } from "../queries/synthesis-context.query";
import { getSynthesisWorkspace } from "../queries/synthesis-workspace.query";
import {
  generateSynthesis,
  acceptSynthesis,
  discardSynthesis,
} from "./synthesis.service";
import {
  createInterviewGuide,
  saveInterviewGuideDraft,
  publishInterviewGuide,
} from "@/features/entrepreneurship/interview-guides/services/interview-guide.service";
import {
  emptyInterviewGuideDocument,
  starterInterviewGuideDocument,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { startConversation } from "@/features/entrepreneurship/conversations/services/conversation.service";
import { saveNexoSettings } from "@/features/nexo/services/nexo-settings.service";
import {
  correctExplorationClaim,
  correctExplorationUncertainty,
  createExplorationUncertainty,
  publishExplorationSnapshot,
} from "@/features/entrepreneurship/exploration-snapshots/services/exploration-snapshot.service";
import { getExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import { SYNTHESIS_TASK } from "@/features/nexo/constants/nexo-task.constants";
import type { SynthesisOutput } from "../types/synthesis.types";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
const enabled = process.env.RUN_ENTREPRENEURSHIP_INTEGRATION === "1";

describe.skipIf(!enabled)(
  "scalable Entrepreneurship and reviewed synthesis",
  () => {
    let userId = "",
      email = "",
      nicheId = "";
    const originalKey = process.env.OPENAI_API_KEY;
    beforeEach(async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        !url.pathname.startsWith("/become_entrepreneurship")
      )
        throw new Error("Dedicated local test database required");
      email = `entrepreneurship-${randomUUID()}@example.test`;
      userId = (
        await prisma.user.create({
          data: { email, name: "Disposable Entrepreneurship QA" },
        })
      ).id;
      nicheId = (
        await prisma.niche.create({
          data: {
            userId,
            name: "Research workflows",
            normalizedName: randomUUID(),
            scope: "Understand how founders organize customer discovery.",
          },
        })
      ).id;
      process.env.OPENAI_API_KEY = "nexo-test-adapter-only";
      vi.mocked(executeOpenAiTask).mockReset();
    });
    afterEach(async () => {
      if (userId) await deleteDisposableBrowserUser(userId, email);
      if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = originalKey;
    });
    async function source() {
      return recordObservation(userId, null, randomUUID(), {
        sourceKind: "DIRECT_OBSERVATION",
        observedAt: "2026-09-20",
        statement: "Founders keep interview notes in several places.",
        sourceDescription: "Observed during a workflow review.",
        nicheId,
        marketType: "B2C",
        identityKind: "ANONYMOUS",
        audienceLabel: "Founder",
      });
    }
    async function context() {
      return prisma.$transaction((tx) =>
        readSynthesisContext(tx, userId, nicheId),
      );
    }
    async function configure() {
      await saveNexoSettings(userId, 0, {
        schemaVersion: 1,
        profiles: [
          {
            id: "synthesis",
            name: "Synthesis",
            provider: "openai",
            model: "test-model",
            reasoning: "default",
            verbosity: "low",
            maxOutputTokens: 4000,
            timeoutSeconds: 30,
          },
        ],
        assignments: [{ taskId: SYNTHESIS_TASK, profileId: "synthesis" }],
        dailyRunLimit: 20,
      });
    }
    function proposal(key: string): SynthesisOutput {
      return {
        schemaVersion: 1,
        title: "What we know",
        summary: "Notes were observed in several places.",
        findings: [
          {
            claimId: null,
            kind: "FACT",
            lane: "B2C",
            statement: "Interview notes are fragmented.",
            sourceKeys: [key],
          },
        ],
        nextQuestions: ["How does this affect follow-up?"],
        limitations: "One workflow observation.",
      };
    }
    it("tracks evidence-linked problems, their assessments, and withdrawal in the complete source membership", async () => {
      const observed = await source();
      const revision = await prisma.observationRevision.findFirstOrThrow({
        where: { observationId: observed.id, userId },
      });
      const problem = await createProblem(userId, randomUUID(), {
        title: "Fragmented discovery notes",
        initialStatement: "Important follow-ups get lost between documents.",
        origin: "USER_HYPOTHESIS",
      });
      const before = await context();
      expect(before.sources.some((item) => item.id === problem.id)).toBe(false);

      const evidence = await linkEvidence(userId, problem.id, randomUUID(), {
        observationId: observed.id,
        observationRevisionId: revision.id,
        stance: "SUPPORTS",
        explanation:
          "The observed workflow connects this problem to the exploration.",
      });
      expect(
        await prisma.problem.count({
          where: {
            userId,
            id: problem.id,
            ...problemExplorationWhere(nicheId),
          },
        }),
      ).toBe(1);
      const linked = await context();
      expect(linked.sources).toContainEqual(
        expect.objectContaining({
          id: problem.id,
          type: "PROBLEM",
        }),
      );
      expect(linked.materialFingerprint).not.toBe(before.materialFingerprint);

      const assessment = await assessProblem(userId, problem.id, randomUUID(), {
        state: "SUPPORTED_FOR_SCOPE",
        scope: "The observed founder's discovery workflow.",
        rationale: "The linked observation supports this limited judgment.",
        assessedAt: "2026-09-22",
        evidenceIds: [evidence.id],
      });
      const assessed = await context();
      expect(assessed.sources).toContainEqual(
        expect.objectContaining({
          id: assessment.id,
          type: "ASSESSMENT",
        }),
      );
      expect(assessed.materialFingerprint).not.toBe(linked.materialFingerprint);

      await withdrawEvidence(
        userId,
        problem.id,
        evidence.id,
        "This interpretation no longer applies.",
      );
      expect(
        await prisma.problem.count({
          where: {
            userId,
            id: problem.id,
            ...problemExplorationWhere(nicheId),
          },
        }),
      ).toBe(0);
      const withdrawn = await context();
      expect(
        withdrawn.sources.some((item) =>
          [problem.id, assessment.id].includes(item.id),
        ),
      ).toBe(false);
      expect(withdrawn.materialFingerprint).not.toBe(
        assessed.materialFingerprint,
      );
      expect(withdrawn.materialFingerprint).toBe(before.materialFingerprint);
    });

    it("stores proposals separately, accepts once, freezes editions, and detects later corrections", async () => {
      const observed = await source();
      await configure();
      const initial = await context();
      const output = proposal(
        initial.sources.find((s) => s.type === "OBSERVATION")!.key,
      );
      vi.mocked(executeOpenAiTask).mockResolvedValue({
        output,
        usage: { inputTokens: 100, outputTokens: 100 },
        providerRequestId: "mock",
      });
      const operation = randomUUID();
      const run = await generateSynthesis(userId, nicheId, operation);
      expect(await prisma.explorationClaim.count({ where: { userId } })).toBe(
        0,
      );
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).proposal?.status,
      ).toBe("READY");
      expect(await generateSynthesis(userId, nicheId, operation)).toEqual(run);
      expect(executeOpenAiTask).toHaveBeenCalledTimes(1);
      const accepted = await acceptSynthesis(userId, nicheId, run.id, output);
      expect(await acceptSynthesis(userId, nicheId, run.id, output)).toEqual(
        accepted,
      );
      expect(
        await prisma.explorationSnapshotEdition.count({ where: { userId } }),
      ).toBe(1);
      const workspace = await getSynthesisWorkspace(userId, nicheId);
      expect(workspace).toMatchObject({
        refreshRecommended: false,
        unpublishedChanges: false,
        proposal: null,
      });
      expect(workspace.latest?.context.materialFingerprint).toBe(
        initial.materialFingerprint,
      );
      await correctObservation(userId, observed.id, randomUUID(), {
        expectedVersion: 1,
        statement: "Only one founder kept notes in several places.",
        sourceDescription: "Corrected sample qualification.",
        observedAt: "2026-09-20",
        correctionReason: "Clarify the sample.",
        meaningUnchanged: false,
        audienceOverride: false,
      });
      const refreshed = await getSynthesisWorkspace(userId, nicheId);
      expect(refreshed.refreshRecommended).toBe(true);
      expect(refreshed.latest?.sourceStates[`OBSERVATION:${observed.id}`]).toBe(
        "changed",
      );
      expect(refreshed.latest?.output).toEqual(output);
      expect(executeOpenAiTask).toHaveBeenCalledTimes(1);
    });
    it("tracks manual unpublished changes independently of AI editions", async () => {
      const question = await createExplorationUncertainty(
        userId,
        randomUUID(),
        {
          nicheId,
          lane: "CROSS_MARKET",
          statement: "Does this also affect larger teams?",
        },
      );
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).unpublishedChanges,
      ).toBe(true);
      await publishExplorationSnapshot(userId, randomUUID(), {
        nicheId,
        claimIds: [],
        uncertaintyIds: [question.id],
      });
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).unpublishedChanges,
      ).toBe(false);
      await correctExplorationUncertainty(userId, question.id, randomUUID(), {
        nicheId,
        expectedVersion: 1,
        lane: "B2B",
        statement: "Does this affect teams with shared accounts?",
        correctionReason: "Narrow the question.",
      });
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).unpublishedChanges,
      ).toBe(true);
      expect(executeOpenAiTask).not.toHaveBeenCalled();
    });
    it("rejects stale or foreign proposals and leaves understanding untouched on provider failure", async () => {
      await source();
      await configure();
      let current = await context();
      const output = proposal(current.sources[0].key);
      vi.mocked(executeOpenAiTask).mockResolvedValue({
        output,
        usage: { inputTokens: 0, outputTokens: 0 },
        providerRequestId: null,
      });
      const run = await generateSynthesis(userId, nicheId, randomUUID());
      await prisma.nicheDecision.create({
        data: {
          userId,
          nicheId,
          direction: "EXPLORING",
          rationale: "Focus on solo founders.",
        },
      });
      await expect(
        acceptSynthesis(userId, nicheId, run.id, output),
      ).rejects.toThrow(/changed during review/);
      await expect(
        acceptSynthesis("different-user", nicheId, run.id, output),
      ).rejects.toThrow(/Choose a proposal/);
      await discardSynthesis(userId, nicheId, run.id);
      vi.mocked(executeOpenAiTask).mockRejectedValue(
        new Error("Provider unavailable"),
      );
      await expect(
        generateSynthesis(userId, nicheId, randomUUID()),
      ).rejects.toThrow(/Generation failed/);
      expect(await prisma.explorationClaim.count({ where: { userId } })).toBe(
        0,
      );
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).proposal?.status,
      ).toBe("FAILED");
      current = await context();
      expect(
        current.sources.some((item) => item.type === "EXPLORATION_DECISION"),
      ).toBe(true);
    });
    it("preserves accepted classifications and explicitly reconciles corrected sources", async () => {
      const observed = await source();
      await configure();
      const key = (await context()).sources[0].key;
      const output = proposal(key);
      output.findings.push(
        ...(
          ["CONTRADICTION", "DECISION", "HYPOTHESIS", "QUESTION"] as const
        ).map((kind) => ({
          claimId: null,
          kind,
          lane: "B2B" as const,
          statement: `A reviewed ${kind.toLowerCase()}.`,
          sourceKeys: [key],
        })),
      );
      vi.mocked(executeOpenAiTask).mockResolvedValue({
        output,
        usage: { inputTokens: 100, outputTokens: 100 },
        providerRequestId: "mock",
      });
      const run = await generateSynthesis(userId, nicheId, randomUUID());
      await acceptSynthesis(userId, nicheId, run.id, output);
      const accepted = await getExplorationSnapshot(userId, nicheId);
      expect(
        accepted!.claims.map((item) => item.revisions[0].kind).sort(),
      ).toEqual(["CONTRADICTION", "DECISION", "OBSERVED"]);
      expect(
        accepted!.uncertainties.map((item) => item.revisions[0].kind).sort(),
      ).toEqual(["HYPOTHESIS", "QUESTION"]);
      await correctObservation(userId, observed.id, randomUUID(), {
        expectedVersion: 1,
        statement: "A single founder kept notes in several places.",
        sourceDescription: "Workflow review.",
        observedAt: "2026-09-20",
        correctionReason: "Clarify the sample",
        meaningUnchanged: false,
        audienceOverride: false,
      });
      const claim = accepted!.claims[0];
      const correction = {
        nicheId,
        expectedVersion: 1,
        kind: claim.revisions[0].kind,
        lane: claim.revisions[0].lane,
        statement: "A revised source-grounded statement.",
        correctionReason: "Reviewed the source correction",
        citations: claim.revisions[0].citations.map((citation) => ({
          observationId: citation.observationId,
          observationRevisionId: citation.observationRevisionId,
          stance: citation.stance,
          note: citation.note,
        })),
      };
      await expect(
        correctExplorationClaim(userId, claim.id, randomUUID(), correction),
      ).rejects.toThrow(/source changed|current version/);
      await correctExplorationClaim(userId, claim.id, randomUUID(), {
        ...correction,
        refreshSources: true,
      });
      const uncertainty = accepted!.uncertainties.find(
        (item) => item.revisions[0].kind === "HYPOTHESIS",
      )!;
      await correctExplorationUncertainty(
        userId,
        uncertainty.id,
        randomUUID(),
        {
          nicheId,
          expectedVersion: 1,
          lane: "B2B",
          statement: "A refined hypothesis.",
          correctionReason: "Review source correction",
          refreshSources: true,
        },
      );
      const updated = await getExplorationSnapshot(userId, nicheId);
      expect(
        updated!.claims.find((item) => item.id === claim.id)!.needsReview,
      ).toBe(false);
      const correctedClaim = updated!.claims.find(
        (item) => item.id === claim.id,
      )!;
      const correctedRevision = correctedClaim.revisions[0];
      expect(correctedRevision.sourceManifest).toMatchObject({
        schemaVersion: 1,
        origin: "USER",
      });
      expect(correctedRevision.citations[0].observationRevisionId).not.toBe(
        correction.citations[0].observationRevisionId,
      );
      expect(
        updated!.uncertainties.find((item) => item.id === uncertainty.id)!
          .revisions[0].kind,
      ).toBe("HYPOTHESIS");
      expect(
        (await getSynthesisWorkspace(userId, nicheId)).latest!.output,
      ).toEqual(output);
    });
    it("publishes prose, preserves whole-document conflicts and pins conversation editions", async () => {
      const document = emptyInterviewGuideDocument();
      document.content.content = [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Explore the real workflow" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Listen without a script.",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ];
      const metadata = {
        nicheId,
        title: "Open discovery",
        objective: "Understand the workflow",
        marketType: "B2B",
        expectedDurationMinutes: 30,
        document,
      };
      const guide = await createInterviewGuide(userId, randomUUID(), metadata);
      const published = await publishInterviewGuide(
        userId,
        guide.id,
        randomUUID(),
        { expectedVersion: 1 },
      );
      const edition = await prisma.interviewGuideRevision.findUniqueOrThrow({
        where: { id: published.id },
      });
      expect(edition.document).toEqual(document);
      expect(edition.questionIndex).toEqual([]);
      const conversation = await startConversation(userId, randomUUID(), {
        nicheId,
        guideRevisionId: edition.id,
        marketType: "B2B",
        identityKind: "ANONYMOUS",
        audienceLabel: "Research participant",
        channel: "OTHER",
      });
      const revised = starterInterviewGuideDocument("B2B");
      revised.content.content!.unshift(document.content.content[0]);
      await saveInterviewGuideDraft(userId, guide.id, randomUUID(), {
        ...metadata,
        document: revised,
        expectedVersion: 1,
      });
      await expect(
        saveInterviewGuideDraft(userId, guide.id, randomUUID(), {
          ...metadata,
          expectedVersion: 1,
        }),
      ).rejects.toThrow(/another tab/);
      await publishInterviewGuide(userId, guide.id, randomUUID(), {
        expectedVersion: 2,
      });
      const resumed = await getConversationWorkspace(
        userId,
        conversation.id,
        nicheId,
      );
      expect(resumed?.interviewSession?.guideRevision?.id).toBe(edition.id);
      expect(resumed?.interviewSession?.guideRevision?.document).toEqual(
        document,
      );
      expect(
        (
          await prisma.interviewGuide.findUniqueOrThrow({
            where: { id: guide.id },
          })
        ).draftDocument,
      ).toEqual(revised);
      const partial = structuredClone(revised);
      const question = partial.content.content!.find(
        (node) => node.type === "interviewQuestion",
      )!;
      question.attrs!.prompt = "";
      question.attrs!.probes = ["One follow-up", ""];
      await saveInterviewGuideDraft(userId, guide.id, randomUUID(), {
        ...metadata,
        document: partial,
        expectedVersion: 2,
      });
      expect(
        (
          await prisma.interviewGuide.findUniqueOrThrow({
            where: { id: guide.id },
          })
        ).draftDocument,
      ).toEqual(partial);
      await expect(
        publishInterviewGuide(userId, guide.id, randomUUID(), {
          expectedVersion: 3,
        }),
      ).rejects.toThrow(/blank questions/);
      expect(
        await prisma.interviewGuideRevision.count({
          where: { guideId: guide.id },
        }),
      ).toBe(2);
    });
    it("rejects malformed and invented citations, prevents concurrent duplicate calls, and preserves discard", async () => {
      await source();
      await configure();
      vi.mocked(executeOpenAiTask).mockResolvedValue({
        output: { invalid: true },
        usage: { inputTokens: 0, outputTokens: 0 },
        providerRequestId: "mock",
      });
      await expect(
        generateSynthesis(userId, nicheId, randomUUID()),
      ).rejects.toThrow(/validation/);
      vi.mocked(executeOpenAiTask).mockResolvedValue({
        output: proposal("OBSERVATION:foreign"),
        usage: { inputTokens: 0, outputTokens: 0 },
        providerRequestId: "mock",
      });
      await expect(
        generateSynthesis(userId, nicheId, randomUUID()),
      ).rejects.toThrow(/not in the reviewed/);
      const output = proposal((await context()).sources[0].key);
      let complete!: (value: {
        output: SynthesisOutput;
        usage: { inputTokens: number; outputTokens: number };
        providerRequestId: string;
      }) => void;
      vi.mocked(executeOpenAiTask).mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
      const key = randomUUID();
      const pending = generateSynthesis(userId, nicheId, key);
      await vi.waitFor(() => expect(complete).toBeTypeOf("function"));
      const duplicate = await generateSynthesis(userId, nicheId, key);
      await discardSynthesis(userId, nicheId, duplicate.id);
      complete({
        output,
        usage: { inputTokens: 0, outputTokens: 0 },
        providerRequestId: "mock",
      });
      await pending;
      expect(
        (
          await prisma.nexoRun.findUniqueOrThrow({
            where: { id: duplicate.id },
          })
        ).status,
      ).toBe("DISCARDED");
      expect(executeOpenAiTask).toHaveBeenCalledTimes(3);
      expect(
        await prisma.explorationSnapshotEdition.count({ where: { userId } }),
      ).toBe(0);
      const settings = await prisma.nexoSettings.findUniqueOrThrow({
        where: { userId },
      });
      await expect(
        saveNexoSettings(userId, 0, settings.config),
      ).rejects.toThrow(/another tab/);
      const changedConfig = {
        ...(settings.config as Record<string, unknown>),
        dailyRunLimit: 7,
      };
      await saveNexoSettings(userId, settings.version, changedConfig);
      const history = await prisma.nexoSettingsRevision.findMany({
        where: { userId },
        orderBy: { version: "asc" },
      });
      expect(history.map((item) => item.version)).toEqual([1, 2]);
      expect(history[0].config).toEqual(settings.config);
      expect(history[1].config).toEqual(changedConfig);
    });
    it("searches offers before pagination and preserves explicit problem-linked scope", async () => {
      const problem = await createProblem(userId, randomUUID(), {
        nicheId,
        title: "Follow-up fragmentation",
        initialStatement: "Notes are hard to connect.",
        origin: "USER_HYPOTHESIS",
      });
      const terms = {
        mode: "AUDIENCE_TEST",
        title: "Older discovery pilot",
        scope: "An early audience test",
        priceBasis: "FIXED",
        amount: "100",
        currency: "EUR",
        problemIds: [problem.id],
      };
      const older = await saveOfferRevision(userId, null, randomUUID(), terms);
      for (let i = 0; i < 26; i++)
        await saveOfferRevision(userId, null, randomUUID(), {
          ...terms,
          nicheId,
          title: `Later offer ${i}`,
          problemIds: [],
        });
      const first = await getOffers(userId, undefined, false, nicheId);
      expect(first.records).toHaveLength(25);
      expect(first.total).toBe(27);
      expect(first.records.some((item) => item.id === older.id)).toBe(false);
      const found = await getOffers(userId, undefined, false, nicheId, {
        q: "Older discovery",
        mode: "AUDIENCE_TEST",
      });
      expect(found.records.map((item) => item.id)).toEqual([older.id]);
      expect(found.total).toBe(1);
      expect(
        (await context()).sources.some(
          (item) => item.key === `OFFER:${older.id}`,
        ),
      ).toBe(true);
      expect(
        (
          await getOffers("foreign-user", undefined, false, nicheId, {
            q: "Older discovery",
          })
        ).total,
      ).toBe(0);
    });
    it("pages large collections, searches older records, and finds message sources beyond the latest window", async () => {
      const interactions = Array.from({ length: 400 }, (_, i) => ({
        id: randomUUID(),
        userId,
        status: "COMPLETED",
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      }));
      await prisma.interaction.createMany({ data: interactions });
      await prisma.interactionRevision.createMany({
        data: interactions.map((item, i) => ({
          id: randomUUID(),
          userId,
          interactionId: item.id,
          version: 1,
          nicheId,
          kind: i < 300 ? "OUTREACH_SENT" : "CONVERSATION",
          respondsToInteractionId: i === 300 ? interactions[0].id : null,
          channel: "EMAIL",
          occurredAt: item.createdAt,
          summary: `${i === 0 ? "Oldest needle" : i === 300 ? "Conversation needle" : "Record"} ${i}`,
        })),
      });
      const conversationId = interactions[300].id;
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: randomUUID(),
        userId,
        interactionId: conversationId,
        position: i + 1,
        operationKey: randomUUID(),
      }));
      await prisma.conversationMessage.createMany({ data: messages });
      await prisma.conversationMessage.update({
        where: { id: messages[2].id },
        data: { bookmarkedAt: new Date() },
      });
      await prisma.conversationMessageRevision.createMany({
        data: messages.map((message, i) => ({
          id: randomUUID(),
          userId,
          messageId: message.id,
          interactionId: conversationId,
          version: 1,
          speakerRole: "PARTICIPANT",
          speakerNameSnapshot: "Customer",
          body: `Message ${i + 1}`,
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
        data: observations.map((observation, i) => ({
          id: randomUUID(),
          userId,
          observationId: observation.id,
          version: 1,
          nicheId,
          kind: "OBSERVATION",
          wordingMode: "PARAPHRASE",
          statement: `Evidence needle ${i}`,
          observedAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
          sourceKind: "DIRECT_OBSERVATION",
          sourceDescription: "Observed test workflow.",
        })),
      });
      const reach = await getReachWorkspace(userId, nicheId);
      expect(reach?.activity).toHaveLength(25);
      expect(reach?.total).toBe(300);
      expect(reach?.next).toBeTruthy();
      const next = await getReachWorkspace(userId, nicheId, {
        cursor: reach!.next!,
      });
      expect(
        next!.activity.some((item) =>
          reach!.activity.some((first) => first.id === item.id),
        ),
      ).toBe(false);
      expect(
        (await getReachWorkspace(userId, nicheId, { q: "Oldest needle" }))
          ?.activity[0].id,
      ).toBe(interactions[0].id);
      const lookup = await searchBusinessRecords(userId, {
        kind: "interaction",
        nicheId,
        q: "Oldest needle",
      });
      expect(lookup.items[0].id).toBe(interactions[0].id);
      expect(
        (await getReachActivityDetail(userId, nicheId, interactions[0].id))
          ?.conversation?.conversationId,
      ).toBe(conversationId);
      const reachOnly = await searchBusinessRecords(userId, {
        kind: "interaction",
        nicheId,
        interactionKinds: ["OUTREACH_SENT", "REPLY_RECEIVED"],
        selectedIds: [conversationId],
      });
      expect(reachOnly.items.some((item) => item.id === conversationId)).toBe(
        false,
      );
      const retained = await searchBusinessRecords(userId, {
        kind: "interaction",
        nicheId,
        q: "Record 399",
        selectedIds: [interactions[0].id],
      });
      expect(
        retained.items.some((item) => item.id === interactions[0].id),
      ).toBe(true);
      expect(
        (
          await searchBusinessRecords("foreign-user", {
            kind: "interaction",
            nicheId,
            selectedIds: [interactions[0].id],
          })
        ).items,
      ).toEqual([]);
      const conversations = await getConversationPage(userId, nicheId);
      expect(conversations.items).toHaveLength(25);
      expect(conversations.total).toBe(100);
      expect(
        (
          await getConversationPage(userId, nicheId, {
            q: "Conversation needle",
          })
        ).items[0].id,
      ).toBe(conversationId);
      const latest = await getConversationWorkspace(
        userId,
        conversationId,
        nicheId,
      );
      expect(latest?.conversationMessages).toHaveLength(50);
      expect(latest?.conversationMessages[0].position).toBe(51);
      expect(latest?.hasEarlier).toBe(true);
      expect(latest?.debriefTotal).toBe(100);
      expect(latest?.debriefMessages[0].id).toBe(messages[2].id);
      const debriefIds = latest!.debriefMessages.map((item) => item.id);
      let debriefCursor = latest!.debriefNext;
      while (debriefCursor) {
        const page = await getConversationDebriefMessages(
          userId,
          conversationId,
          debriefCursor,
        );
        debriefIds.push(...page.items.map((item) => item.id));
        debriefCursor = page.next;
      }
      expect(new Set(debriefIds).size).toBe(100);
      const older = await getConversationWorkspace(
        userId,
        conversationId,
        nicheId,
        { before: latest!.earlierCursor! },
      );
      expect(older?.conversationMessages[0].position).toBe(1);
      const cited = await getConversationWorkspace(
        userId,
        conversationId,
        nicheId,
        { message: messages[2].id },
      );
      expect(
        cited?.conversationMessages.some((item) => item.id === messages[2].id),
      ).toBe(true);
      const evidence = await getEvidenceJournal(userId, {
        nicheId,
        q: "Evidence needle",
        sourceKind: "OBSERVATION",
      });
      expect(evidence.entries).toHaveLength(25);
      expect(evidence.next).toBeTruthy();
      await prisma.observationRevision.updateMany({
        where: { observationId: observations[0].id, userId },
        data: {
          sourceKind: "INTERACTION",
          interactionId: conversationId,
          interactionRevisionId: (
            await prisma.interactionRevision.findFirstOrThrow({
              where: { interactionId: conversationId, userId, version: 1 },
            })
          ).id,
        },
      });
      const sourceSearch = await getEvidenceJournal(userId, {
        nicheId,
        q: "Evidence needle 0",
        sourceKind: "INTERACTION",
      });
      expect(sourceSearch.entries.map((entry) => entry.id)).toEqual([
        conversationId,
      ]);
      expect(sourceSearch.entries[0].observations).toEqual([]);
      const bounded = await context();
      expect(bounded.coverage.eligibleSources).toBe(600);
      expect(bounded.coverage.omittedSources).toBeGreaterThan(0);
      expect(new Set(bounded.sources.map((source) => source.type))).toEqual(
        new Set(["OUTREACH", "CONVERSATION", "OBSERVATION", "MESSAGE"]),
      );
      await prisma.interaction.update({
        where: { id: interactions[0].id },
        data: { voidedAt: new Date() },
      });
      expect((await context()).materialFingerprint).not.toBe(
        bounded.materialFingerprint,
      );
    }, 30000);
  },
);
