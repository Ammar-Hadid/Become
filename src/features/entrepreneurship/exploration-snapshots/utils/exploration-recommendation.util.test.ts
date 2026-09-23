import { describe, expect, it } from "vitest";
import { recommendExplorationNextMove } from "@/features/entrepreneurship/exploration-snapshots/utils/exploration-recommendation.util";
import type { ExplorationRecommendationFacts } from "@/features/entrepreneurship/exploration-snapshots/types/exploration-snapshot.types";

const complete: ExplorationRecommendationFacts = {
  overdueFollowUpId: null,
  activeConversationId: null,
  scopeReady: true,
  targets: 2,
  outreach: 2,
  replies: 1,
  conversations: 1,
  replyWithoutConversationId: null,
  observations: 2,
  repeatedObservationsWithoutProblem: false,
  supportedProblemWithoutTestId: null,
  activeTestWithoutOutcomeId: null,
  snapshotStale: false,
};

describe("recommendExplorationNextMove", () => {
  it("prioritizes a due commitment over new work", () => {
    expect(
      recommendExplorationNextMove({
        ...complete,
        overdueFollowUpId: "follow-up",
        activeConversationId: "conversation",
      }),
    ).toMatchObject({ code: "COMPLETE_FOLLOW_UP", targetId: "follow-up" });
  });

  it("resumes an interrupted interview before suggesting new research", () => {
    expect(
      recommendExplorationNextMove({
        ...complete,
        activeConversationId: "conversation",
      }),
    ).toMatchObject({ code: "RESUME_INTERVIEW", targetId: "conversation" });
  });

  it("walks an empty exploration from scope to reach to learning", () => {
    expect(
      recommendExplorationNextMove({ ...complete, scopeReady: false }).code,
    ).toBe("DEFINE_SCOPE");
    expect(recommendExplorationNextMove({ ...complete, targets: 0 }).code).toBe(
      "ADD_TARGET",
    );
    expect(
      recommendExplorationNextMove({ ...complete, outreach: 0 }).code,
    ).toBe("BEGIN_OUTREACH");
    expect(
      recommendExplorationNextMove({
        ...complete,
        replyWithoutConversationId: "reply",
      }).code,
    ).toBe("START_CONVERSATION");
  });

  it("reviews the snapshot only after operational and learning gaps", () => {
    expect(
      recommendExplorationNextMove({ ...complete, snapshotStale: true }).code,
    ).toBe("REVIEW_SNAPSHOT");
  });
});
