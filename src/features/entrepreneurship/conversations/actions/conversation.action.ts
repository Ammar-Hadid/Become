"use server";

import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  addConversationMessage,
  askConversationGuideQuestion,
  bookmarkConversationMessage,
  cancelConversation,
  correctConversationMessage,
  finishConversation,
  promoteMessageToObservation,
  resumeConversation,
  startConversation,
  switchConversationGuide,
  updateConversationConductState,
  voidConversationMessage,
} from "@/features/entrepreneurship/conversations/services/conversation.service";

export async function startConversationAction(
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    startConversation(userId, operationKey, input),
  );
}

export async function addConversationMessageAction(
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    addConversationMessage(userId, interactionId, operationKey, input),
  );
}

export async function correctConversationMessageAction(
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    correctConversationMessage(userId, messageId, operationKey, input),
  );
}

export async function voidConversationMessageAction(
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    voidConversationMessage(userId, messageId, operationKey, input),
  );
}

export async function bookmarkConversationMessageAction(
  messageId: string,
  operationKey: string,
  bookmarked: boolean,
) {
  return businessMutation((userId) =>
    bookmarkConversationMessage(userId, messageId, operationKey, {
      bookmarked,
    }),
  );
}

export async function updateConversationConductStateAction(
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    updateConversationConductState(userId, interactionId, operationKey, input),
  );
}

export async function askConversationGuideQuestionAction(
  interactionId: string,
  operationKey: string,
  questionId: string,
) {
  return businessMutation((userId) =>
    askConversationGuideQuestion(userId, interactionId, operationKey, {
      questionId,
    }),
  );
}

export async function switchConversationGuideAction(
  interactionId: string,
  operationKey: string,
  guideRevisionId: string | null,
) {
  return businessMutation((userId) =>
    switchConversationGuide(userId, interactionId, operationKey, {
      guideRevisionId,
    }),
  );
}

export async function promoteMessageToObservationAction(
  messageId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    promoteMessageToObservation(userId, messageId, operationKey, input),
  );
}

export async function finishConversationAction(
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    finishConversation(userId, interactionId, operationKey, input),
  );
}

export async function cancelConversationAction(
  interactionId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    cancelConversation(userId, interactionId, operationKey, input),
  );
}

export async function resumeConversationAction(
  interactionId: string,
  operationKey: string,
) {
  return businessMutation((userId) =>
    resumeConversation(userId, interactionId, operationKey),
  );
}
