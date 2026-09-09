import type {
  GoalView,
  ExperimentView,
} from "@/features/direction/types/direction.types";
export type SeasonStandard = {
  key: string;
  trait: string;
  behavior: string;
  goalId?: string;
  criterionId?: string;
};
export type SeasonCharacter = {
  name: string;
  sourceWork: string;
  adaptation: string;
  motivation: string;
  avoid: string;
  tone: "DIRECT" | "HARSH" | "RUTHLESS";
  standards: SeasonStandard[];
};
export type SeasonAnswers = {
  carryForward: string;
  leaveBehind: string;
  protect: string;
  meaningful: string;
  deferredSteps: number[];
};
export type Provenance = {
  origin: "MANUAL" | "DISCOVERY";
  sourceUrl: string | null;
  credit: string | null;
  sourceTitle: string | null;
  provider: string | null;
  externalId: string | null;
  selectedAt: string;
  attributionVerified: boolean;
};
export type SeasonMediaView = {
  id: string;
  href: string;
  alt: string;
  decorative: boolean;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  poster: boolean;
  provenance: Provenance;
};
export type SeasonQuoteView = {
  id: string;
  text: string;
  attribution: string;
  kind: "EXACT" | "PARAPHRASE" | "UNKNOWN";
  featured: boolean;
  provenance: Provenance;
};
export type SeasonCalendar = {
  year: number;
  quarter: number;
  label: string;
  startOn: string;
  endOn: string;
  totalDays: number;
  dayNumber: number;
  daysAfterToday: number;
  phase:
    | "UPCOMING"
    | "OPENING"
    | "LIVING"
    | "MIDPOINT"
    | "FINAL_14"
    | "FINAL_7"
    | "FINAL_3"
    | "ENDED";
  timeLabel: string;
};
export type SeasonDraft = {
  title: string;
  intention: string;
  answers: SeasonAnswers;
  character: SeasonCharacter;
  stage: number;
};
export type SeasonCapturedOutcome = {
  id: string;
  title: string;
  kind: "GOAL" | "EXPERIMENT";
  role: "PRIMARY" | "SUPPORTING" | null;
  stateLabel: string;
  progressSummary: string;
};
export type SeasonClosingCard = {
  capturedAt: string;
  title: string;
  intention: string;
  character: SeasonCharacter;
  media: SeasonMediaView[];
  quotes: SeasonQuoteView[];
  note: string;
  primaryGoal: { id: string; title: string } | null;
  outcomes: SeasonCapturedOutcome[];
};
export type SeasonView = SeasonDraft & {
  id: string | null;
  year: number;
  quarter: number;
  version: number;
  calendar: SeasonCalendar;
  openingCompletedAt: string | null;
  media: SeasonMediaView[];
  quotes: SeasonQuoteView[];
  goals: { role: "PRIMARY" | "SUPPORTING"; note: string; goal: GoalView }[];
  experiments: ExperimentView[];
  cadence: { key: string; title: string; body: string } | null;
  closedAt: string | null;
  closingNote: string | null;
  closingSnapshot: unknown | null;
  closingCard: SeasonClosingCard | null;
  readyForReview: boolean;
  previous: {
    title: string;
    year: number;
    quarter: number;
    href: string;
    closingNote: string | null;
  } | null;
};
