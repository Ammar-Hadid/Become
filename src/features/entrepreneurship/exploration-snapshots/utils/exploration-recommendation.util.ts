import type {
  ExplorationRecommendation,
  ExplorationRecommendationFacts,
} from "@/features/entrepreneurship/exploration-snapshots/types/exploration-snapshot.types";

export function recommendExplorationNextMove(
  facts: ExplorationRecommendationFacts,
): ExplorationRecommendation {
  if (facts.overdueFollowUpId)
    return {
      code: "COMPLETE_FOLLOW_UP",
      stage: "REACH",
      title: "Complete the due follow-up",
      reason: "A follow-up is due before more new work is added.",
      targetId: facts.overdueFollowUpId,
    };
  if (facts.activeConversationId)
    return {
      code: "RESUME_INTERVIEW",
      stage: "LEARN",
      title: "Resume the interview",
      reason:
        "A conversation is already in progress and its messages are safe.",
      targetId: facts.activeConversationId,
    };
  if (!facts.scopeReady)
    return {
      code: "DEFINE_SCOPE",
      stage: "SCOPE",
      title: "Define what you are exploring",
      reason:
        "The exploration needs a clear question or boundary before its records can be interpreted.",
      targetId: null,
    };
  if (!facts.targets)
    return {
      code: "ADD_TARGET",
      stage: "SCOPE",
      title: "Add someone to learn from",
      reason:
        "There is scope, but no person, segment, or business to contact yet.",
      targetId: null,
    };
  if (!facts.outreach)
    return {
      code: "BEGIN_OUTREACH",
      stage: "REACH",
      title: "Reach out to a target",
      reason: "The exploration has targets but no recorded outreach.",
      targetId: null,
    };
  if (facts.replyWithoutConversationId)
    return {
      code: "START_CONVERSATION",
      stage: "LEARN",
      title: "Turn a reply into a conversation",
      reason:
        "Someone replied, but their experience has not been explored in a conversation yet.",
      targetId: facts.replyWithoutConversationId,
    };
  if (facts.conversations > 0 && !facts.observations)
    return {
      code: "CAPTURE_OBSERVATIONS",
      stage: "LEARN",
      title: "Keep the useful observations",
      reason:
        "Conversations exist, but no source-grounded observations have been kept from them.",
      targetId: null,
    };
  if (facts.repeatedObservationsWithoutProblem)
    return {
      code: "ARTICULATE_PROBLEM",
      stage: "DECIDE",
      title: "Name the repeated problem",
      reason:
        "Several observations exist without a problem statement that can be assessed.",
      targetId: null,
    };
  if (facts.supportedProblemWithoutTestId)
    return {
      code: "START_TEST",
      stage: "TEST",
      title: "Test the supported problem",
      reason:
        "A problem has supporting evidence but no connected offer or test.",
      targetId: facts.supportedProblemWithoutTestId,
    };
  if (facts.activeTestWithoutOutcomeId)
    return {
      code: "RECORD_TEST_OUTCOME",
      stage: "TEST",
      title: "Record what happened",
      reason: "An active test has no observable outcome yet.",
      targetId: facts.activeTestWithoutOutcomeId,
    };
  if (facts.snapshotStale)
    return {
      code: "REVIEW_SNAPSHOT",
      stage: "SNAPSHOT",
      title: "Review what you know now",
      reason:
        "Material learning has been recorded since the latest published snapshot.",
      targetId: null,
    };
  return {
    code: "CHOOSE_NEXT_MOVE",
    stage: "SNAPSHOT",
    title: "Choose the next useful move",
    reason:
      "No urgent gap dominates; choose the interview, follow-up, or test that reduces the most uncertainty.",
    targetId: null,
  };
}
