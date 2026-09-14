export type AudienceContextView = {
  id: string;
  marketType: string;
  description: string | null;
  segments: {
    segmentId: string;
    nameSnapshot: string;
    descriptionSnapshot: string | null;
  }[];
};
export type AudienceView = {
  audienceContext?: AudienceContextView | null;
  audienceContextId?: string | null;
  identityKind?: string;
  personId?: string | null;
  personSnapshot?: string | null;
  companyId?: string | null;
  companySnapshot?: string | null;
  audienceLabel?: string | null;
  sampleSize?: number | null;
  sampleUnit?: string | null;
};
export type AudienceOption = {
  id: string;
  name: string;
  marketType?: string;
  description?: string | null;
  archivedAt?: Date | null;
};

export type AudienceReviewContext = {
  explorationIds: string[];
  version: 1;
  marketType: string | null;
  classification: "RECORDED" | "NOT_RECORDED";
  contextId: string | null;
  description: string | null;
  segments: { id: string; name: string; description: string | null }[];
  identityKind: string;
  personId: string | null;
  personLabel: string | null;
  businessId: string | null;
  businessLabel: string | null;
  sourceDescription: string | null;
  reportedSampleSize: number | null;
  reportedSampleUnit: string | null;
  recipientOutcome: {
    engagementId: string | null;
    offerRevisionId: string | null;
    kind: string;
    version?: number;
    mode?: string;
    priceMinor?: string | null;
    currency?: string | null;
    priceBasis?: string;
    intervalUnit?: string | null;
    intervalCount?: number | null;
    scope?: string;
    terms?: string | null;
  } | null;
};
