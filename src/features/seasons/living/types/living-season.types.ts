export type LivingSeasonState =
  | "ON_TRACK"
  | "NEUTRAL"
  | "FAR_BEHIND"
  | "INSUFFICIENT_EVIDENCE";

export type LivingSeasonFacts = {
  chapter: number;
  dayNumber: number;
  totalDays: number;
  state: LivingSeasonState;
  expectedPercent: number | null;
  actualPercent: number | null;
  gapPoints: number | null;
  measuredGoals: number;
  totalGoals: number;
  goals: {
    id: string;
    title: string;
    expectedPercent: number | null;
    actualPercent: number | null;
    gapPoints: number | null;
    missingEvidence: boolean;
  }[];
};
