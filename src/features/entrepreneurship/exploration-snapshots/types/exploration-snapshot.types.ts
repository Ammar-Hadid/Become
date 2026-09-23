import type {
  EXPLORATION_CITATION_STANCES,
  EXPLORATION_CLAIM_KINDS,
  EXPLORATION_JOURNEY_STAGES,
  EXPLORATION_KNOWLEDGE_LANES,
} from "@/features/entrepreneurship/exploration-snapshots/constants/exploration-snapshot.constants";

export type ExplorationKnowledgeLane =
  (typeof EXPLORATION_KNOWLEDGE_LANES)[number];
export type ExplorationClaimKind = (typeof EXPLORATION_CLAIM_KINDS)[number];
export type ExplorationCitationStance =
  (typeof EXPLORATION_CITATION_STANCES)[number];
export type ExplorationJourneyStage =
  (typeof EXPLORATION_JOURNEY_STAGES)[number];

export type ExplorationCoverage = {
  targets: number;
  outreach: number;
  replies: number;
  conversations: number;
  observations: number;
  problems: number;
  tests: number;
  outcomes: number;
  latestMaterialAt: string | null;
};

export type ExplorationRecommendationFacts = {
  overdueFollowUpId: string | null;
  activeConversationId: string | null;
  scopeReady: boolean;
  targets: number;
  outreach: number;
  replies: number;
  conversations: number;
  replyWithoutConversationId: string | null;
  observations: number;
  repeatedObservationsWithoutProblem: boolean;
  supportedProblemWithoutTestId: string | null;
  activeTestWithoutOutcomeId: string | null;
  snapshotStale: boolean;
};

export type ExplorationRecommendation = {
  code:
    | "COMPLETE_FOLLOW_UP"
    | "RESUME_INTERVIEW"
    | "DEFINE_SCOPE"
    | "ADD_TARGET"
    | "BEGIN_OUTREACH"
    | "START_CONVERSATION"
    | "CAPTURE_OBSERVATIONS"
    | "ARTICULATE_PROBLEM"
    | "START_TEST"
    | "RECORD_TEST_OUTCOME"
    | "REVIEW_SNAPSHOT"
    | "CHOOSE_NEXT_MOVE";
  stage: ExplorationJourneyStage;
  title: string;
  reason: string;
  targetId: string | null;
};
