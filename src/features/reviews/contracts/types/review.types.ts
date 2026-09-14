import type { AudienceReviewContext } from "@/features/entrepreneurship/audiences/types/audience.types";
import type { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
import type { Timeframe } from "@/lib/dates/utils/period.util";
import type {
  SeasonMediaView,
  SeasonQuoteView,
} from "@/features/seasons/types/season.types";
import type { PersonaInput } from "@/features/seasons/persona/schemas/persona.schema";

export type ReviewDomain =
  | "sessions"
  | "engineering"
  | "finance"
  | "entrepreneurship"
  | "content"
  | "direction"
  | "ideas"
  | "decisions";
export type ReviewPeriod = {
  timeframe: Timeframe;
  startOn: string;
  endOn: string;
  start: string;
  end: string;
  evaluatedThrough: string;
  label: string;
  state: "OPEN" | "ENDED" | "UPCOMING";
  timezone: "Europe/Amsterdam";
  comparison: {
    start: string;
    end: string;
    label: string;
    mode: "EQUAL_ELAPSED" | "FULL_CALENDAR";
    available: boolean;
  };
};
export type ReviewSource = {
  /** Absent in older editions; never reconstruct historical audience from live entities. */
  audience?: AudienceReviewContext | null;
  key: string;
  metricKey: string;
  kind: string;
  id: string;
  revision: string;
  label: string;
  excerpt: string;
  occurredAt: string;
  href: string | null;
  value: string;
  unit: string;
  currency: string | null;
  dimension: string | null;
  imageHref: string | null;
  qualification: string;
  meaning: "FACT" | "USER_JUDGMENT";
  truncated: boolean;
};
export type ReviewMetric = {
  key: string;
  domain: ReviewDomain;
  label: string;
  value: string;
  valueLabel: string;
  unit: string;
  currency: string | null;
  sourceCount: number;
  previousValue: string | null;
  deltaLabel: string | null;
  qualification: string;
  fingerprint: string;
  availability: "AVAILABLE" | "RECORDED_ZERO" | "NOT_RECORDED";
};
export type ReviewMoment = ReviewSource & {
  selectionReason: string;
  selected: boolean;
};
export type ReviewIntention = {
  id: string;
  kind: "GOAL" | "EXPERIMENT";
  title: string;
  href: string;
  original: string | null;
  originalRecordedAt: string | null;
  originalTarget: string | null;
  current: string;
  status: string;
  conclusion: string | null;
  changes: { id: string; occurredAt: string; reason: string }[];
  historyCoverage: string;
  progress: string;
  criteriaReached: boolean | null;
};
export type ReviewIdentity = {
  seasonId: string | null;
  year: number;
  quarter: number;
  title: string;
  intention: string;
  originalIntention?: string | null;
  originalRecordedAt?: string | null;
  intentionCoverage?: string;
  characterName: string;
  media: SeasonMediaView[];
  quotes: SeasonQuoteView[];
  persona: PersonaInput;
  legacyClosing: boolean;
};
export type PeriodReviewFacts = {
  audience?: {
    version: 1;
    summary: Awaited<ReturnType<typeof getAudienceMetrics>>;
  };
  schemaVersion: 1;
  metricVersion: 1;
  fingerprint: string;
  referenceTime: string;
  period: ReviewPeriod;
  domains: ReviewDomain[];
  metrics: ReviewMetric[];
  sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS";
  seasonChapters?: {
    year: number;
    quarter: number;
    title: string;
    intention: string;
    characterName: string;
    href: string;
  }[];
  time: {
    seconds: number;
    provisionalSeconds: number;
    provisionalLabel: string | null;
    allocations: { label: string; seconds: number; share: number }[];
    buckets: { label: string; start: string; end: string; seconds: number }[];
    /** Absent in older frozen editions; never reconstruct from current sessions. */
    domainBreakdown?: {
      version: 1;
      series: {
        domainId: string;
        label: string;
        seconds: number;
        provisionalSeconds: number;
        provisionalLabel: string | null;
        buckets: {
          label: string;
          start: string;
          end: string;
          seconds: number;
        }[];
      }[];
    };
  };
  identity: ReviewIdentity;
  intentions: ReviewIntention[];
  moments: ReviewMoment[];
  coverage: {
    domain: ReviewDomain;
    state: "RECORDED" | "NOT_RECORDED";
    detail: string;
  }[];
  warnings: string[];
  omitted: { moments: number; intentions: number };
  payloadBytes: number;
};
export type ReviewWriting = {
  reflection: string;
  carryForward: string;
  leaveBehind: string;
  selectedMomentKeys: string[];
};
export type ReviewEditionSummary = {
  id: string;
  number: number;
  kind: "PRESENTATION" | "FINALIZED" | "AMENDMENT";
  capturedAt: string;
  fingerprint: string;
  supersedesId: string | null;
};
export type ReviewView = {
  storageScope: string;
  id: string | null;
  version: number;
  facts: PeriodReviewFacts;
  writing: ReviewWriting;
  edition: ReviewEditionSummary | null;
  editions: ReviewEditionSummary[];
  liveChanged: boolean;
  liveComparisonAvailable: boolean;
  canFinalize: boolean;
  reviewHref: string;
  finaleHref: string | null;
};
export type ReviewEvidencePage = {
  schemaVersion: 1;
  metricVersion: 1;
  period: ReviewPeriod;
  referenceTime: string;
  fingerprint: string;
  editionId: string | null;
  total: number;
  items: ReviewSource[];
  nextCursor: string | null;
  warnings: string[];
  payloadBytes: number;
};
export type ReviewHistoryItem = {
  timeframe: Timeframe;
  startOn: string;
  label: string;
  href: string;
  title: string;
  status: "DRAFT" | "FINALIZED";
  updatedAt: string;
};
export type ReviewHistory = {
  items: ReviewHistoryItem[];
  nextCursor: string | null;
};
export type SeasonTransitionView = {
  storageScope: string;
  id: string | null;
  version: number;
  from: {
    year: number;
    quarter: number;
    startOn: string;
    label: string;
  } | null;
  disposition:
    "AVAILABLE" | "IN_PROGRESS" | "DEFERRED" | "SKIPPED" | "COMPLETED";
  movement: number;
  completedMovements: number;
  autoEligible: boolean;
  occupied: boolean;
  leaseOwned: boolean;
  leaseUntil: string | null;
  editionId: string | null;
  finaleHref: string | null;
  destinationHref: string;
  destinationLabel: string;
  openingComplete: boolean;
  replay: boolean;
  review: ReviewView | null;
};
export type CarryForwardSuggestion = {
  editionId: string;
  reviewHref: string;
  label: string;
  carryForward: string;
  leaveBehind: string;
  unfinished: { id: string; title: string; href: string }[];
};
export type ReviewCommandResult = {
  error: string | null;
  view?: ReviewView;
  transition?: SeasonTransitionView;
  fieldErrors?: Record<string, string>;
};
