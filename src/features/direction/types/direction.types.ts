export type DirectionLifecycle = "ACTIVE" | "PAUSED" | "CONCLUDED";
export type GoalOutcome = "ACHIEVED" | "PARTIAL" | "STOPPED";
export type ExperimentOutcome = "SUPPORTED" | "NOT_SUPPORTED" | "INCONCLUSIVE";
export type MetricKey =
  | "MANUAL"
  | "WORK_SOURCE_INCOME"
  | "BUSINESS_RECEIPTS"
  | "NEW_RECURRING_COMPANY"
  | "CONVERSATIONS"
  | "CONVERSATION_COMPANIES"
  | "CONVERSATION_PEOPLE"
  | "SESSION_TIME"
  | "ENGINEERING_EVIDENCE"
  | "ENGINEERING_PROJECT_COMPLETED"
  | "SAVINGS_GOAL"
  | "CONTENT_CREATED"
  | "CONTENT_VARIANTS_CREATED"
  | "CONTENT_PUBLICATIONS";
export type OwnedOption = {
  id: string;
  name: string;
  description?: string;
  archived?: boolean;
};
export type PageResult<T> = { items: T[]; nextCursor: string | null };
export type CriterionDraft = {
  contentId?: string;
  channelId?: string;
  contentFormat?: "LONG_FORM" | "SHORT_VERTICAL" | "OTHER";
  selectedContentOnly?: boolean;
  selectedOutreachOnly?: boolean;
  id?: string;
  key: string;
  metric: MetricKey;
  label: string;
  target: string;
  currency?: string;
  startOn?: string;
  endOn?: string;
  workSourceId?: string;
  companyId?: string;
  personId?: string;
  segmentId?: string;
  marketType?: "UNKNOWN" | "B2C" | "B2B" | "BOTH";
  offerRevisionId?: string;
  nicheId?: string;
  projectId?: string;
  domainId?: string;
  activityTypeId?: string;
  savingsGoalId?: string;
  evidenceType?: string;
  minimumReceived?: string;
  baselineAssertions?: {
    companyId: string;
    noPriorPaidRelationship: boolean;
    note: string;
  }[];
};
export type SourceItem = {
  id: string;
  label: string;
  href: string | null;
  occurredAt: string | null;
  value: string | null;
  note: string | null;
  state: "QUALIFYING" | "EXCLUDED" | "REVIEW" | "MISSING";
};
export type CriterionEvaluation = {
  id: string;
  key: string;
  metric: MetricKey;
  label: string;
  value: string | null;
  target: string | null;
  unit: string;
  currency: string | null;
  valueLabel: string;
  targetLabel: string | null;
  availability:
    | "AVAILABLE"
    | "RECORDED_ZERO"
    | "NOT_CONFIGURED"
    | "PARTIAL"
    | "PENDING_REVIEW"
    | "UNSUPPORTED";
  reached: boolean | null;
  qualification: string;
  exclusions: string[];
  caveats: string[];
  conditions: { label: string; reached: boolean | null; detail: string }[];
  sourceCount: number;
  sources: SourceItem[];
  nextCursor: string | null;
  evaluatedAt: string;
  fingerprint: string;
};
export type ContentCohortEvidence = {
  sources: {
    id: string;
    label: string;
    href: string;
    variantCount: number;
    publicationCount: number;
    observationCount: number;
    latestObservedAt: string | null;
    archived: boolean;
  }[];
  fingerprint: string;
};
export type Evaluation = {
  contentCohort?: ContentCohortEvidence;
  criteria: CriterionEvaluation[];
  criteriaMet: boolean | null;
  progressSummary: string;
  evaluatedAt: string;
  fingerprint: string;
};
export type DirectionChangeView = {
  id: string;
  kind: string;
  reason: string;
  createdAt: string;
  snapshot: unknown;
  details: string[];
};
export type GoalDraft = {
  title: string;
  description?: string;
  startOn: string;
  targetOn?: string;
  domainIds: string[];
  criterionMode: "ALL" | "ANY";
  criteria: CriterionDraft[];
};
export type CriterionScopes = Record<
  string,
  Partial<
    Record<
      | "contentId"
      | "channelId"
      | "workSourceId"
      | "companyId"
      | "personId"
      | "segmentId"
      | "offerRevisionId"
      | "nicheId"
      | "projectId"
      | "domainId"
      | "activityTypeId"
      | "savingsGoalId",
      OwnedOption
    >
  >
>;
export type GoalView = GoalDraft & {
  id: string;
  version: number;
  status: DirectionLifecycle;
  outcome: GoalOutcome | null;
  archivedAt: string | null;
  concludedAt: string | null;
  conclusion: string | null;
  domains: OwnedOption[];
  seasons: {
    year: number;
    quarter: number;
    role: "PRIMARY" | "SUPPORTING";
    href: string;
  }[];
  evaluation: Evaluation;
  progressSummary: string;
  conclusionSnapshot: Evaluation | null;
  liveChangedSinceConclusion: boolean;
  history: DirectionChangeView[];
  historyNextCursor: string | null;
  criterionScopes: CriterionScopes;
};
export type ExperimentDraft = {
  title: string;
  question: string;
  approach: string;
  startOn: string;
  targetOn?: string;
  stoppingCondition?: string;
  expectedEvidence?: string;
  goalId?: string;
  repeatedFromId?: string;
  domainIds: string[];
  criterionMode: "ALL" | "ANY";
  criteria: CriterionDraft[];
  sourceInteractionIds: string[];
  sourceContentIds?: string[];
};
export type ExperimentView = ExperimentDraft & {
  id: string;
  version: number;
  status: DirectionLifecycle;
  outcome: ExperimentOutcome | null;
  archivedAt: string | null;
  concludedAt: string | null;
  result: string | null;
  learning: string | null;
  domains: OwnedOption[];
  goal: OwnedOption | null;
  previousAttempt: OwnedOption | null;
  sources: SourceItem[];
  evaluation: Evaluation;
  conclusionSnapshot: Evaluation | null;
  liveChangedSinceConclusion: boolean;
  history: DirectionChangeView[];
  historyNextCursor: string | null;
  criterionScopes: CriterionScopes;
};
export type MetricCapability = {
  key: MetricKey;
  name: string;
  description: string;
  unit: string;
  scopes: string[];
  monetary: boolean;
  caveat: string | null;
};
export type CommandResult = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  id?: string;
  version?: number;
  savedAt?: string;
  fingerprint?: string;
};
