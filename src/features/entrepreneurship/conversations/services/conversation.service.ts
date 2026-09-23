import type { Prisma } from "@/generated/prisma/client";
import {
  audienceSnapshot,
  captureAudience,
} from "@/features/entrepreneurship/audiences/services/audience.service";
import {
  askConversationGuideQuestionSchema,
  bookmarkConversationMessageSchema,
  cancelConversationSchema,
  conversationConductStateSchema,
  conversationMessageSchema,
  correctConversationMessageSchema,
  finishConversationSchema,
  promoteMessageObservationSchema,
  startConversationSchema,
  switchConversationGuideSchema,
  voidConversationMessageSchema,
} from "@/features/entrepreneurship/conversations/schemas/conversation.schema";
import { saveCapturedObservations } from "@/features/entrepreneurship/observations/services/captured-observation.service";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function currentConversation(
  tx: Prisma.TransactionClient,
  userId: string,
  interactionId: string,
) {
  const conversation = await tx.interaction.findFirst({
    where: { id: interactionId, userId, voidedAt: null },
    include: {
      revisions: { orderBy: { version: "desc" }, take: 1 },
      interviewSession: true,
    },
  });
  if (!conversation || conversation.revisions[0]?.kind !== "CONVERSATION")
    throw new BusinessError("Choose a conversation you own.");
  const revision = conversation.revisions[0];
  if (revision.nicheId) {
    const activeExploration = await tx.niche.findFirst({
      where: { id: revision.nicheId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!activeExploration)
      throw new BusinessError(
        "This conversation belongs to an archived exploration and is read-only.",
      );
  }
  return { conversation, revision };
}

function requireConversationCanContinue(status: string) {
  if (status === "COMPLETED")
    throw new BusinessError(
      "A completed conversation is read-only. Start a follow-up conversation to keep learning.",
    );
  if (status === "CANCELLED")
    throw new BusinessError("Resume the conversation before continuing it.");
}

async function requireGuideRevision(
  tx: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  guideRevisionId: string | null,
) {
  if (!guideRevisionId) return null;
  const revision = await tx.interviewGuideRevision.findFirst({
    where: {
      id: guideRevisionId,
      userId,
      guide: { nicheId },
    },
    include: { guide: { select: { archivedAt: true } } },
  });
  if (!revision || revision.guide.archivedAt)
    throw new BusinessError("Choose a published guide from this exploration.");
  return revision;
}

function questionIds(questionIndex: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(questionIndex)) return new Set<string>();
  return new Set(
    questionIndex.flatMap((item) =>
      item && typeof item === "object" && "questionId" in item
        ? [String(item.questionId)]
        : [],
    ),
  );
}

function guideQuestions(questionIndex: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(questionIndex)) return [];
  return questionIndex.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("questionId" in item) ||
      !("prompt" in item) ||
      typeof item.questionId !== "string" ||
      typeof item.prompt !== "string"
    )
      return [];
    return [{ questionId: item.questionId, prompt: item.prompt }];
  });
}

export async function startConversation(
  userId: string,
  operationKey: string,
  input: unknown,
) {
  const data = startConversationSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const niche = await tx.niche.findFirst({
      where: { id: data.nicheId, userId, archivedAt: null },
    });
    if (!niche)
      throw new BusinessError("Choose an active exploration you own.");
    const linked = data.linkedInteractionId
      ? await tx.interaction.findFirst({
          where: { id: data.linkedInteractionId, userId, voidedAt: null },
          include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
        })
      : null;
    if (data.linkedInteractionId) {
      if (
        !linked ||
        linked.revisions[0]?.nicheId !== data.nicheId ||
        !["OUTREACH_SENT", "REPLY_RECEIVED"].includes(linked.revisions[0]?.kind)
      )
        throw new BusinessError(
          "Link a reply or outreach record from this exploration.",
        );
      const existingConversation = await tx.$queryRaw<{ id: string }[]>`
        SELECT i.id
        FROM interaction i
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE i."userId" = ${userId}
          AND i."voidedAt" IS NULL
          AND r.kind = 'CONVERSATION'
          AND r."respondsToInteractionId" = ${data.linkedInteractionId}
        LIMIT 1
      `;
      if (existingConversation[0])
        throw new BusinessError(
          "This Reach record already continues in a conversation.",
        );
    }
    const linkedRevision = linked?.revisions[0] ?? null;
    const hasExplicitAudience = Boolean(
      data.identityKind !== "UNSPECIFIED" ||
      data.personId ||
      data.personName ||
      data.companyId ||
      data.companyName ||
      data.audienceLabel ||
      data.sampleSize ||
      data.segmentIds.length ||
      data.segmentNames.length ||
      data.audienceDescription,
    );
    const audience =
      linkedRevision && !hasExplicitAudience
        ? audienceSnapshot(linkedRevision)
        : await captureAudience(tx, userId, data, data.nicheId);
    if (linkedRevision && hasExplicitAudience) {
      const sameParticipant = linkedRevision.personId
        ? linkedRevision.personId === audience.personId
        : linkedRevision.companyId
          ? linkedRevision.companyId === audience.companyId
          : linkedRevision.identityKind === audience.identityKind &&
            linkedRevision.audienceLabel === audience.audienceLabel;
      if (!sameParticipant)
        throw new BusinessError(
          "The conversation and linked Reach record must refer to the same participant.",
        );
    }
    await requireGuideRevision(tx, userId, data.nicheId, data.guideRevisionId);
    const interaction = await tx.interaction.create({
      data: { userId, status: "DRAFT" },
    });
    await tx.interactionRevision.create({
      data: {
        userId,
        interactionId: interaction.id,
        version: 1,
        ...audience,
        nicheId: niche.id,
        nicheSnapshot: niche.name,
        respondsToInteractionId: data.linkedInteractionId,
        kind: "CONVERSATION",
        channel: data.channel,
        platform: data.platform ?? null,
        occurredAt: data.occurredAt,
        datePrecision: "MINUTE",
        summary: data.summary ?? "Interview in progress",
        notes: data.notes,
      },
    });
    await tx.interviewSession.create({
      data: {
        userId,
        interactionId: interaction.id,
        guideRevisionId: data.guideRevisionId,
      },
    });
    return interaction.id;
  });
}

export async function addConversationMessage(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = conversationMessageSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    requireConversationCanContinue(conversation.status);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`conversation:${interactionId}`}, 0))::text`;
    const session = await tx.interviewSession.findUnique({
      where: { interactionId_userId: { interactionId, userId } },
      include: { guideRevision: true },
    });
    if (
      data.guideQuestionId &&
      !questionIds(session?.guideRevision?.questionIndex).has(
        data.guideQuestionId,
      )
    )
      throw new BusinessError(
        "Choose a question from the pinned guide revision.",
      );
    const latest = await tx.conversationMessage.findFirst({
      where: { interactionId, userId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const message = await tx.conversationMessage.create({
      data: {
        userId,
        interactionId,
        operationKey,
        position: (latest?.position ?? -1) + 1,
      },
    });
    await tx.conversationMessageRevision.create({
      data: {
        userId,
        interactionId,
        messageId: message.id,
        version: 1,
        speakerRole: data.speakerRole,
        speakerNameSnapshot:
          data.speakerRole === "ME" ? "Me" : data.speakerName,
        body: data.body,
        occurredAt: data.occurredAt,
        channel: data.channel,
        platform: data.platform ?? null,
        guideQuestionId: data.guideQuestionId,
      },
    });
    await tx.interaction.update({
      where: { id_userId: { id: interactionId, userId } },
      data: { status: "IN_PROGRESS" },
    });
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: {
        status: "IN_PROGRESS",
        ...(data.guideQuestionId
          ? {
              currentQuestionId: data.guideQuestionId,
              guideCompletedAt: null,
            }
          : {}),
      },
    });
    return message.id;
  });
}

export async function correctConversationMessage(
  userId: string,
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  const data = correctConversationMessageSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const message = await tx.conversationMessage.findFirst({
      where: { id: messageId, userId, voidedAt: null },
      include: {
        interaction: true,
        revisions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!message || message.version !== data.expectedVersion)
      throw new BusinessError(
        "This message changed. Review its latest version before correcting it.",
      );
    await currentConversation(tx, userId, message.interactionId);
    if (data.guideQuestionId) {
      const session = await tx.interviewSession.findUnique({
        where: {
          interactionId_userId: {
            interactionId: message.interactionId,
            userId,
          },
        },
        include: { guideRevision: true },
      });
      if (
        !questionIds(session?.guideRevision?.questionIndex).has(
          data.guideQuestionId,
        )
      )
        throw new BusinessError(
          "Choose a question from the pinned guide revision.",
        );
    }
    await tx.conversationMessageRevision.create({
      data: {
        userId,
        interactionId: message.interactionId,
        messageId,
        version: message.version + 1,
        speakerRole: data.speakerRole,
        speakerNameSnapshot:
          data.speakerRole === "ME" ? "Me" : data.speakerName,
        body: data.body,
        occurredAt: data.occurredAt,
        channel: data.channel,
        platform: data.platform ?? null,
        guideQuestionId: data.guideQuestionId,
        correctionReason: data.correctionReason,
      },
    });
    await tx.conversationMessage.update({
      where: { id_userId: { id: messageId, userId } },
      data: { version: { increment: 1 } },
    });
    return messageId;
  });
}

export async function voidConversationMessage(
  userId: string,
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  const data = voidConversationMessageSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const message = await tx.conversationMessage.findFirst({
      where: { id: messageId, userId, voidedAt: null },
    });
    if (!message) throw new BusinessError("Choose an active message you own.");
    await currentConversation(tx, userId, message.interactionId);
    await tx.conversationMessage.update({
      where: { id_userId: { id: messageId, userId } },
      data: { voidedAt: new Date(), voidReason: data.reason },
    });
    return messageId;
  });
}

export async function bookmarkConversationMessage(
  userId: string,
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  const data = bookmarkConversationMessageSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const message = await tx.conversationMessage.findFirst({
      where: { id: messageId, userId, voidedAt: null },
    });
    if (!message) throw new BusinessError("Choose an active message you own.");
    await currentConversation(tx, userId, message.interactionId);
    await tx.conversationMessage.update({
      where: { id_userId: { id: messageId, userId } },
      data: { bookmarkedAt: data.bookmarked ? new Date() : null },
    });
    return messageId;
  });
}

export async function updateConversationConductState(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = conversationConductStateSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    requireConversationCanContinue(conversation.status);
    const session = await tx.interviewSession.findUnique({
      where: { interactionId_userId: { interactionId, userId } },
      include: { guideRevision: true },
    });
    const ids = questionIds(session?.guideRevision?.questionIndex);
    if (
      (data.currentQuestionId && !ids.has(data.currentQuestionId)) ||
      data.skippedQuestionIds.some((id) => !ids.has(id))
    )
      throw new BusinessError("Use questions from the pinned guide revision.");
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: {
        currentQuestionId: data.currentQuestionId,
        skippedQuestionIds: json([...new Set(data.skippedQuestionIds)]),
        guideCompletedAt:
          data.currentQuestionId === null && ids.size > 0 ? new Date() : null,
      },
    });
    return interactionId;
  });
}

export async function askConversationGuideQuestion(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = askConversationGuideQuestionSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation, revision } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    requireConversationCanContinue(conversation.status);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`conversation:${interactionId}`}, 0))::text`;
    const session = await tx.interviewSession.findUnique({
      where: { interactionId_userId: { interactionId, userId } },
      include: { guideRevision: true },
    });
    const questions = guideQuestions(session?.guideRevision?.questionIndex);
    if (!session?.guideRevision || !questions.length)
      throw new BusinessError(
        "Pin a published guide before asking a guide question.",
      );
    if (session.guideCompletedAt)
      throw new BusinessError("This guide is already complete.");
    const expectedIndex = session.currentQuestionId
      ? questions.findIndex(
          (question) => question.questionId === session.currentQuestionId,
        )
      : 0;
    const question = questions[expectedIndex];
    if (!question || question.questionId !== data.questionId)
      throw new BusinessError(
        "The guide position changed. Review the current question before asking it.",
      );
    const latest = await tx.conversationMessage.findFirst({
      where: { interactionId, userId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const message = await tx.conversationMessage.create({
      data: {
        userId,
        interactionId,
        operationKey,
        position: (latest?.position ?? -1) + 1,
      },
    });
    await tx.conversationMessageRevision.create({
      data: {
        userId,
        interactionId,
        messageId: message.id,
        version: 1,
        speakerRole: "ME",
        speakerNameSnapshot: "Me",
        body: question.prompt,
        occurredAt: new Date(),
        channel: revision.channel,
        platform: revision.platform,
        guideQuestionId: question.questionId,
      },
    });
    const nextQuestion = questions[expectedIndex + 1] ?? null;
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: {
        status: "IN_PROGRESS",
        currentQuestionId: nextQuestion?.questionId ?? null,
        guideCompletedAt: nextQuestion ? null : new Date(),
      },
    });
    await tx.interaction.update({
      where: { id_userId: { id: interactionId, userId } },
      data: { status: "IN_PROGRESS" },
    });
    return message.id;
  });
}

export async function switchConversationGuide(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = switchConversationGuideSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation, revision } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    requireConversationCanContinue(conversation.status);
    const count = await tx.conversationMessage.count({
      where: { interactionId, userId },
    });
    if (count)
      throw new BusinessError(
        "A conversation stays pinned to its guide revision after the first message.",
      );
    await requireGuideRevision(
      tx,
      userId,
      revision.nicheId!,
      data.guideRevisionId,
    );
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: {
        guideRevisionId: data.guideRevisionId,
        currentQuestionId: null,
        skippedQuestionIds: [],
        guideCompletedAt: null,
      },
    });
    return interactionId;
  });
}

export async function promoteMessageToObservation(
  userId: string,
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  const data = promoteMessageObservationSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const message = await tx.conversationMessage.findFirst({
      where: { id: messageId, userId, voidedAt: null },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!message || message.version !== data.expectedMessageVersion)
      throw new BusinessError(
        "This message changed. Review the latest wording before keeping an observation.",
      );
    const currentMessage = message.revisions[0];
    if (!currentMessage)
      throw new BusinessError("This message has no readable version.");
    if (currentMessage.speakerRole !== "PARTICIPANT")
      throw new BusinessError(
        "Keep participant messages as observations; interviewer prompts remain conversation context.",
      );
    const { revision } = await currentConversation(
      tx,
      userId,
      message.interactionId,
    );
    if (!revision.nicheId)
      throw new BusinessError(
        "This conversation is not part of an exploration.",
      );
    const saved = await saveCapturedObservations(tx, userId, [data], {
      audienceContextId: revision.audienceContextId,
      identityKind: revision.identityKind,
      personId: revision.personId,
      personSnapshot: revision.personSnapshot,
      audienceLabel: revision.audienceLabel,
      sampleSize: revision.sampleSize,
      sampleUnit: revision.sampleUnit,
      observedAt: currentMessage.occurredAt,
      companyId: revision.companyId,
      companySnapshot: revision.companySnapshot,
      nicheId: revision.nicheId,
      nicheSnapshot: revision.nicheSnapshot,
      interactionId: message.interactionId,
      interactionRevisionId: revision.id,
      sourceMessageId: message.id,
      sourceMessageRevisionId: currentMessage.id,
      sourceKind: "MESSAGE",
    });
    return saved[0].observationId;
  });
}

export async function finishConversation(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = finishConversationSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation, revision } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    if (conversation.status === "COMPLETED") return interactionId;
    if (conversation.status === "CANCELLED")
      throw new BusinessError(
        "Resume the conversation before completing its debrief.",
      );
    const selectedIds = data.observationMessages.map(
      (message) => message.messageId,
    );
    const selectedMessages = selectedIds.length
      ? await tx.conversationMessage.findMany({
          where: {
            id: { in: selectedIds },
            userId,
            interactionId,
            voidedAt: null,
          },
          include: {
            revisions: { orderBy: { version: "desc" }, take: 1 },
            observationRevisions: {
              where: { observation: { voidedAt: null } },
              select: { id: true },
            },
          },
        })
      : [];
    if (selectedMessages.length !== selectedIds.length)
      throw new BusinessError(
        "Review the selected messages before completing this debrief.",
      );
    for (const selected of data.observationMessages) {
      const message = selectedMessages.find(
        (candidate) => candidate.id === selected.messageId,
      );
      const messageRevision = message?.revisions[0];
      if (
        !message ||
        !messageRevision ||
        message.version !== selected.expectedVersion
      )
        throw new BusinessError(
          "A selected message changed. Review its latest wording before completing the debrief.",
        );
      if (message.observationRevisions.length)
        throw new BusinessError(
          "One selected message is already kept as an observation.",
        );
      if (messageRevision.speakerRole !== "PARTICIPANT")
        throw new BusinessError(
          "Keep participant messages as observations; interviewer prompts remain conversation context.",
        );
      const [saved] = await saveCapturedObservations(
        tx,
        userId,
        [
          {
            kind: "CUSTOMER_STATEMENT",
            wordingMode: "QUOTE",
            statement: messageRevision.body,
            sourceDescription: messageRevision.body,
            audienceReason: null,
            problemId: null,
            stance: "CONTEXT",
            explanation: null,
          },
        ],
        {
          audienceContextId: revision.audienceContextId,
          identityKind: revision.identityKind,
          personId: revision.personId,
          personSnapshot: revision.personSnapshot,
          audienceLabel: revision.audienceLabel,
          sampleSize: revision.sampleSize,
          sampleUnit: revision.sampleUnit,
          observedAt: messageRevision.occurredAt,
          companyId: revision.companyId,
          companySnapshot: revision.companySnapshot,
          nicheId: revision.nicheId,
          nicheSnapshot: revision.nicheSnapshot,
          interactionId,
          interactionRevisionId: revision.id,
          sourceMessageId: message.id,
          sourceMessageRevisionId: messageRevision.id,
          sourceKind: "MESSAGE",
        },
      );
      if (!saved)
        throw new BusinessError(
          "Become could not confirm the selected observation.",
        );
    }
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: {
        status: "COMPLETED",
        outcome: data.outcome,
        nextAction: data.nextAction,
        takeaways: json(data.takeaways),
        summary: data.summary,
        cancelReason: null,
        debriefCompletedAt: new Date(),
      },
    });
    await tx.interaction.update({
      where: { id_userId: { id: interactionId, userId } },
      data: { status: "COMPLETED" },
    });
    return interactionId;
  });
}

export async function cancelConversation(
  userId: string,
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  const data = cancelConversationSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const { conversation } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    if (conversation.status === "COMPLETED")
      throw new BusinessError("A completed conversation cannot be cancelled.");
    if (conversation.status === "CANCELLED") return interactionId;
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: { status: "CANCELLED", cancelReason: data.reason },
    });
    await tx.interaction.update({
      where: { id_userId: { id: interactionId, userId } },
      data: { status: "CANCELLED" },
    });
    return interactionId;
  });
}

export async function resumeConversation(
  userId: string,
  interactionId: string,
  operationKey: string,
) {
  return captureOnce(userId, operationKey, { interactionId }, async (tx) => {
    const { conversation } = await currentConversation(
      tx,
      userId,
      interactionId,
    );
    if (conversation.status === "COMPLETED")
      throw new BusinessError("This completed conversation cannot be resumed.");
    if (conversation.status !== "CANCELLED") return interactionId;
    await tx.interviewSession.update({
      where: { interactionId_userId: { interactionId, userId } },
      data: { status: "IN_PROGRESS", cancelReason: null },
    });
    await tx.interaction.update({
      where: { id_userId: { id: interactionId, userId } },
      data: { status: "IN_PROGRESS" },
    });
    return interactionId;
  });
}
