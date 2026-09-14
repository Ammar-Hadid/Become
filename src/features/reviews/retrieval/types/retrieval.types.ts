import type { readAudienceCurrentContext } from "@/features/entrepreneurship/measurements/queries/audience-current-context.query";
import type { PersonaInput } from "@/features/seasons/persona/schemas/persona.schema";
import type {
  ReviewPeriod,
  ReviewMetric,
  ReviewSource,
  ReviewDomain,
} from "@/features/reviews/contracts/types/review.types";
import type { TargetedRetrievalRequest } from "@/features/reviews/retrieval/schemas/retrieval.schema";
export type ContextIntention = {
  id: string;
  kind: "GOAL" | "EXPERIMENT";
  title: string;
  description: string;
  status: string;
  startOn: string;
  targetOn: string | null;
  href: string;
  version: number;
};
export type CurrentContextSummary = {
  entrepreneurship?: Awaited<ReturnType<typeof readAudienceCurrentContext>>;
  schemaVersion: 1;
  metricVersion: 1;
  fingerprint: string;
  referenceTime: string;
  period: ReviewPeriod;
  sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS";
  season: {
    id: string | null;
    title: string;
    intention: string;
    year: number;
    quarter: number;
    persona: PersonaInput;
    fingerprint: string;
  };
  priorities: { id: string; title: string; role: string; href: string }[];
  activeIntentions: ContextIntention[];
  recent: {
    period: ReviewPeriod;
    domains: ReviewDomain[];
    metrics: ReviewMetric[];
    sources: ReviewSource[];
  };
  coverage: {
    domain: ReviewDomain;
    state: "RECORDED" | "NOT_RECORDED";
    detail: string;
  }[];
  omitted: { activeIntentions: number; recentSources: number };
  warnings: string[];
  payloadBytes: number;
};
export type RetrievalEvent = {
  id: string;
  kind: string;
  at: string;
  reason: string;
  details: Record<string, string | null>;
  truncated: boolean;
};
export type TargetedRetrieval = {
  schemaVersion: 1;
  metricVersion: 1;
  fingerprint: string;
  referenceTime: string;
  period: ReviewPeriod | null;
  sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS";
  query: TargetedRetrievalRequest;
  records: {
    id: string;
    kind: string;
    href: string;
    fields: Record<string, string | null>;
    events: RetrievalEvent[];
  }[];
  metrics: ReviewMetric[];
  sources: ReviewSource[];
  total: number;
  nextCursor: string | null;
  coverage: "RECORDED" | "NOT_RECORDED";
  warnings: string[];
  payloadBytes: number;
};
