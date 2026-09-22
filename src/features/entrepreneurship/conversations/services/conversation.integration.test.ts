import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
import {
  addConversationMessage,
  askConversationGuideQuestion,
  cancelConversation,
  correctConversationMessage,
  finishConversation,
  promoteMessageToObservation,
  resumeConversation,
  startConversation,
  switchConversationGuide,
} from "@/features/entrepreneurship/conversations/services/conversation.service";
import { getConversationWorkspace } from "@/features/entrepreneurship/conversations/queries/conversation.query";
import {
  ensureStarterInterviewGuides,
  publishInterviewGuide,
  saveInterviewGuideDraft,
} from "@/features/entrepreneurship/interview-guides/services/interview-guide.service";
import {
  getInterviewGuide,
  getInterviewGuideIndex,
} from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { logInteraction } from "@/features/entrepreneurship/interactions/services/interaction.service";
import { getReachWorkspace } from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import {
  evidenceCondition,
  getProblemDetail,
} from "@/features/entrepreneurship/problems/queries/problem.query";

const enabled = process.env.RUN_ENTREPRENEURSHIP_INTEGRATION === "1";

describe.skipIf(!enabled)("Entrepreneurship investigation workspace", () => {
  let userId = "";
  let email = "";

  beforeEach(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/become_entrepreneurship/.test(url.pathname)
    )
      throw new Error("Use the dedicated Entrepreneurship test database.");
    email = `entrepreneurship-${randomUUID()}@example.test`;
    userId = (
      await prisma.user.create({
        data: { email, name: "Disposable Entrepreneurship QA" },
      })
    ).id;
  });

  afterEach(async () => {
    if (userId) await deleteDisposableBrowserUser(userId, email);
  });

  it("keeps Reach separate and preserves exact message provenance", async () => {
    const niche = await prisma.niche.create({
      data: {
        userId,
        name: "Interview workflow",
        normalizedName: `interview-${randomUUID()}`,
        scope: "Understand how people prepare for customer interviews.",
      },
    });
    await ensureStarterInterviewGuides(userId, niche.id, randomUUID());
    const guides = await getInterviewGuideIndex(userId, niche.id);
    const guide = guides.find((candidate) => candidate.marketType === "B2C")!;
    const guideDraft = await getInterviewGuide(userId, guide.id);
    const saveKey = randomUUID();
    const saveInput = {
      nicheId: niche.id,
      title: "B2C workflow interview",
      objective: guide.objective,
      marketType: "B2C",
      segmentId: null,
      expectedDurationMinutes: guide.expectedDurationMinutes,
      expectedVersion: guide.version,
      document: guideDraft!.draftDocument,
    };
    const saved = await saveInterviewGuideDraft(
      userId,
      guide.id,
      saveKey,
      saveInput,
    );
    expect(saved!.version).toBe(2);
    expect(
      (await saveInterviewGuideDraft(userId, guide.id, saveKey, saveInput))!
        .version,
    ).toBe(2);
    await expect(
      saveInterviewGuideDraft(userId, guide.id, randomUUID(), saveInput),
    ).rejects.toThrow(/changed in another tab/);
    await publishInterviewGuide(userId, guide.id, randomUUID(), {
      expectedVersion: saved!.version,
    });
    const revision = await prisma.interviewGuideRevision.findFirstOrThrow({
      where: { userId, guideId: guide.id },
    });

    const outreach = await logInteraction(userId, randomUUID(), {
      kind: "OUTREACH_SENT",
      channel: "DM",
      occurredAt: "2026-09-20",
      summary: "Invited Maya to an interview",
      identityKind: "PERSON",
      personName: "Maya",
      marketType: "B2C",
      nicheId: niche.id,
    });
    await expect(
      startConversation(userId, randomUUID(), {
        nicheId: niche.id,
        linkedInteractionId: outreach.id,
        guideRevisionId: revision.id,
        channel: "CALL",
        occurredAt: new Date("2026-09-20T11:00:00Z"),
        summary: "Wrong participant",
        identityKind: "PERSON",
        personName: "Someone else",
        marketType: "B2C",
      }),
    ).rejects.toThrow(/same participant/);
    const conversation = await startConversation(userId, randomUUID(), {
      nicheId: niche.id,
      linkedInteractionId: outreach.id,
      guideRevisionId: revision.id,
      channel: "CALL",
      occurredAt: new Date("2026-09-20T12:00:00Z"),
      summary: "Interview with Maya",
    });
    await expect(
      startConversation(userId, randomUUID(), {
        nicheId: niche.id,
        linkedInteractionId: outreach.id,
        guideRevisionId: revision.id,
        channel: "CALL",
        occurredAt: new Date("2026-09-20T12:00:00Z"),
        summary: "Duplicate interview from the same Reach record",
      }),
    ).rejects.toThrow(/already continues in a conversation/);
    const questionKey = randomUUID();
    const question = await addConversationMessage(
      userId,
      conversation.id,
      questionKey,
      {
        speakerRole: "ME",
        speakerName: "Ignored",
        body: "How do you prepare today?",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T12:01:00Z"),
        guideQuestionId: "b2c-context",
      },
    );
    expect(
      await addConversationMessage(userId, conversation.id, questionKey, {
        speakerRole: "ME",
        speakerName: "Ignored",
        body: "How do you prepare today?",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T12:01:00Z"),
        guideQuestionId: "b2c-context",
      }),
    ).toEqual(question);
    await expect(
      promoteMessageToObservation(userId, question.id, randomUUID(), {
        expectedMessageVersion: 1,
        kind: "CUSTOMER_STATEMENT",
        wordingMode: "QUOTE",
        statement: "How do you prepare today?",
        sourceDescription: "Interviewer prompt",
        problemId: null,
        stance: "CONTEXT",
        explanation: null,
      }),
    ).rejects.toThrow(/participant messages/);
    const answer = await addConversationMessage(
      userId,
      conversation.id,
      randomUUID(),
      {
        speakerRole: "PARTICIPANT",
        speakerName: "Maya",
        body: "I keep a loose document and lose the follow-up questions.",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T12:02:00Z"),
      },
    );
    const problem = await prisma.problem.create({
      data: {
        userId,
        title: "Interview follow-ups get lost",
        initialStatement:
          "Founders lose follow-up questions between interviews.",
        origin: "OBSERVATION",
        nicheId: niche.id,
        nicheSnapshot: niche.name,
      },
    });
    const observation = await promoteMessageToObservation(
      userId,
      answer.id,
      randomUUID(),
      {
        expectedMessageVersion: 1,
        kind: "CUSTOMER_STATEMENT",
        wordingMode: "QUOTE",
        statement: "I keep a loose document and lose the follow-up questions.",
        sourceDescription: "Exact interview message",
        problemId: problem.id,
        stance: "SUPPORTS",
        explanation: "The message directly describes the follow-up loss.",
      },
    );
    await correctConversationMessage(userId, answer.id, randomUUID(), {
      expectedVersion: 1,
      speakerRole: "PARTICIPANT",
      speakerName: "Maya",
      body: "I keep a loose document and often lose the follow-up questions.",
      channel: "CALL",
      occurredAt: new Date("2026-09-20T12:02:00Z"),
      correctionReason: "Restored a missed word from the recording.",
    });
    await expect(
      switchConversationGuide(userId, conversation.id, randomUUID(), {
        guideRevisionId: null,
      }),
    ).rejects.toThrow(/first message/);
    const debriefCandidate = await addConversationMessage(
      userId,
      conversation.id,
      randomUUID(),
      {
        speakerRole: "PARTICIPANT",
        speakerName: "Maya",
        body: "Usually I remember the missing question after the call.",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T12:03:00Z"),
      },
    );
    await finishConversation(userId, conversation.id, randomUUID(), {
      outcome: "Useful problem signal",
      takeaways: ["Preparation and follow-up live in separate places."],
      nextAction: "Interview two more founders",
      observationMessages: [
        { messageId: debriefCandidate.id, expectedVersion: 1 },
      ],
    });

    const workspace = await getConversationWorkspace(userId, conversation.id);
    expect(workspace).toMatchObject({
      status: "COMPLETED",
      historicalSummaryOnly: false,
    });
    expect(workspace!.conversationMessages).toHaveLength(3);
    expect(workspace!.conversationMessages[1].revisions).toHaveLength(2);
    expect(
      workspace!.conversationMessages[2].observationRevisions,
    ).toHaveLength(1);
    const source = await prisma.observationRevision.findFirstOrThrow({
      where: { observationId: observation.id },
    });
    expect(source).toMatchObject({
      sourceKind: "MESSAGE",
      sourceMessageId: answer.id,
      sourceMessageRevisionId:
        workspace!.conversationMessages[1].revisions[1].id,
    });
    const problemDetail = await getProblemDetail(userId, problem.id);
    expect(evidenceCondition(problemDetail!.evidence[0])).toBe("REVIEW");

    const reach = await getReachWorkspace(userId, niche.id);
    expect(reach!.activity.map((item) => item.id)).toContain(outreach.id);
    expect(reach!.activity.map((item) => item.id)).not.toContain(
      conversation.id,
    );
    const evidence = await getEvidenceJournal(userId, { nicheId: niche.id });
    expect(evidence.entries.map((item) => item.id)).not.toContain(outreach.id);
    expect(evidence.entries.map((item) => item.id)).toContain(conversation.id);
    const observationsOnly = await getEvidenceJournal(userId, {
      nicheId: niche.id,
      sourceKind: "OBSERVATION",
    });
    expect(observationsOnly.entries.map((item) => item.id)).toContain(
      observation.id,
    );
    expect(
      observationsOnly.entries.every((item) => item.type === "OBSERVATION"),
    ).toBe(true);
    const messageSources = await getEvidenceJournal(userId, {
      nicheId: niche.id,
      sourceKind: "MESSAGE",
    });
    expect(messageSources.entries.map((item) => item.id)).toContain(
      observation.id,
    );

    await expect(
      cancelConversation(userId, conversation.id, randomUUID(), {
        reason: "Too late",
      }),
    ).rejects.toThrow(/completed conversation/);

    const resumable = await startConversation(userId, randomUUID(), {
      nicheId: niche.id,
      guideRevisionId: revision.id,
      channel: "CALL",
      occurredAt: new Date("2026-09-20T13:00:00Z"),
      summary: "Interrupted interview",
      identityKind: "PERSON",
      personName: "Jon",
      marketType: "B2C",
    });
    await cancelConversation(userId, resumable.id, randomUUID(), {
      reason: "Connection dropped",
    });
    await expect(
      addConversationMessage(userId, resumable.id, randomUUID(), {
        speakerRole: "ME",
        speakerName: "Me",
        body: "Can we continue?",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T13:01:00Z"),
      }),
    ).rejects.toThrow(/Resume the conversation/);
    await resumeConversation(userId, resumable.id, randomUUID());
    await expect(
      addConversationMessage(userId, resumable.id, randomUUID(), {
        speakerRole: "ME",
        speakerName: "Me",
        body: "Can we continue?",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T13:02:00Z"),
      }),
    ).resolves.toBeTruthy();
    const askKey = randomUUID();
    const firstAskedQuestion = await askConversationGuideQuestion(
      userId,
      resumable.id,
      askKey,
      { questionId: "b2c-context" },
    );
    expect(
      await askConversationGuideQuestion(userId, resumable.id, askKey, {
        questionId: "b2c-context",
      }),
    ).toEqual(firstAskedQuestion);
    await askConversationGuideQuestion(userId, resumable.id, randomUUID(), {
      questionId: "b2c-current-way",
    });
    await askConversationGuideQuestion(userId, resumable.id, randomUUID(), {
      questionId: "b2c-consequence",
    });
    const completedGuide = await getConversationWorkspace(
      userId,
      resumable.id,
      niche.id,
    );
    expect(completedGuide!.interviewSession!.guideCompletedAt).toBeInstanceOf(
      Date,
    );
    expect(completedGuide!.conversationMessages).toHaveLength(4);

    await prisma.interviewGuide.update({
      where: { id_userId: { id: guide.id, userId } },
      data: { archivedAt: new Date() },
    });
    await expect(
      startConversation(userId, randomUUID(), {
        nicheId: niche.id,
        guideRevisionId: revision.id,
        channel: "CALL",
        occurredAt: new Date("2026-09-20T13:03:00Z"),
        summary: "Archived guide should not start new work",
        identityKind: "PERSON",
        personName: "Sam",
        marketType: "B2C",
      }),
    ).rejects.toThrow(/published guide/);

    await prisma.niche.update({
      where: { id_userId: { id: niche.id, userId } },
      data: { archivedAt: new Date() },
    });
    await expect(
      addConversationMessage(userId, resumable.id, randomUUID(), {
        speakerRole: "PARTICIPANT",
        speakerName: "Jon",
        body: "A late note should not mutate archived research.",
        channel: "CALL",
        occurredAt: new Date("2026-09-20T13:03:00Z"),
      }),
    ).rejects.toThrow(/archived exploration/);
  });
});
