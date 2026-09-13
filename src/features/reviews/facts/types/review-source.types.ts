import type { Prisma } from "@/generated/prisma/client";
import type { ReviewDomain } from "@/features/reviews/contracts/types/review.types";
export type ReviewReadScope = {
  userId: string;
  start: Date;
  end: Date;
  at: Date;
  domainId?: string;
  workSourceId?: string;
  companyId?: string;
  currency?: string;
};
export type ReviewMetricDefinition = {
  key: string;
  domain: ReviewDomain;
  label: string;
  unit: "seconds" | "count" | "minor";
  qualification: string;
  moment: boolean;
};
export type ReviewSourceProvider = {
  definitions: ReviewMetricDefinition[];
  sql: (scope: ReviewReadScope) => Prisma.Sql;
};
export type ReviewSourceRow = {
  metricKey: string;
  kind: string;
  id: string;
  revision: string;
  label: string;
  excerpt: string;
  occurredAt: Date;
  href: string | null;
  value: string;
  currency: string | null;
  dimension: string | null;
  imageHref: string | null;
  meaning: "FACT" | "USER_JUDGMENT";
  truncated: boolean;
};
