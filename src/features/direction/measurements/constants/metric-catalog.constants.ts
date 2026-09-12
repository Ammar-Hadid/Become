import type { MetricCapability } from "@/features/direction/types/direction.types";
export const METRIC_CATALOG: MetricCapability[] = [
  {
    key: "MANUAL",
    name: "Evidence and your judgment",
    description: "A dated assessment of a qualitative outcome.",
    unit: "confirmation",
    scopes: [],
    monetary: false,
    caveat: "User assessment; it does not replace recorded domain totals.",
  },
  {
    key: "WORK_SOURCE_INCOME",
    name: "Income from a WorkSource",
    description: "Actual earned-work income from one canonical source.",
    unit: "money",
    scopes: ["workSourceId"],
    monetary: true,
    caveat:
      "Expected earnings, names without source attribution, and other inflows do not count.",
  },
  {
    key: "BUSINESS_RECEIPTS",
    name: "Received from a company",
    description:
      "Confirmed amounts explicitly attributed to a company and optional offer revision.",
    unit: "money",
    scopes: ["companyId", "offerRevisionId"],
    monetary: true,
    caveat: "Only the qualifying portion of a receipt counts.",
  },
  {
    key: "NEW_RECURRING_COMPANY",
    name: "First payment under new recurring terms",
    description:
      "A newly paying company, accepted monthly terms, and a receipt under those same terms.",
    unit: "company",
    scopes: ["companyId", "offerRevisionId"],
    monetary: true,
    caveat:
      "This is not MRR or proof of an active recurring income relationship. A positive receipt does not prove a full month was paid.",
  },
  {
    key: "CONVERSATIONS",
    name: "Customer conversations",
    description:
      "Recorded conversations in the selected exploration or company.",
    unit: "conversations",
    scopes: ["nicheId", "companyId"],
    monetary: false,
    caveat: "Outreach attempts, replies and timer hours are not conversations.",
  },
  {
    key: "CONVERSATION_COMPANIES",
    name: "Companies conversed with",
    description: "Distinct companies with qualifying conversations.",
    unit: "companies",
    scopes: ["nicheId", "companyId"],
    monetary: false,
    caveat: "Several conversations with one company count as one company.",
  },
  {
    key: "SESSION_TIME",
    name: "Recorded focus time",
    description: "Completed session time, clipped to the selected dates.",
    unit: "minutes",
    scopes: ["domainId", "activityTypeId", "projectId", "nicheId", "companyId"],
    monetary: false,
    caveat:
      "Running timers are provisional. Time is not an outcome or proof of external activity.",
  },
  {
    key: "ENGINEERING_EVIDENCE",
    name: "Engineering evidence",
    description: "Recorded outputs of a chosen kind or project.",
    unit: "records",
    scopes: ["projectId", "evidenceType"],
    monetary: false,
    caveat:
      "Recorded evidence does not independently verify external completion or quality.",
  },
  {
    key: "ENGINEERING_PROJECT_COMPLETED",
    name: "Engineering project completed",
    description: "The selected Engineering project's current completion state.",
    unit: "project status",
    scopes: ["projectId"],
    monetary: false,
    caveat:
      "Checks the project's current status, regardless of goal dates. Reopening the project makes this criterion unmet; archiving does not change its status.",
  },
  {
    key: "SAVINGS_GOAL",
    name: "Existing Finance savings goal",
    description: "Current spending, funding and reserve coverage from Finance.",
    unit: "funding readiness",
    scopes: ["savingsGoalId"],
    monetary: false,
    caveat:
      "Allocation is intention. Funding readiness does not automatically conclude this goal.",
  },
];
