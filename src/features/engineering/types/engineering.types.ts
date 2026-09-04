import type {
  ENGINEERING_CONTEXT_VALUES,
  ENGINEERING_EVIDENCE_TYPE_VALUES,
  ENGINEERING_PROJECT_STATUS_VALUES,
} from "@/features/engineering/constants/engineering.constants";
import type { TECHNOLOGY_CATEGORY_VALUES } from "@/features/engineering/technologies/constants/engineering-technology.constants";
import type { SessionListItem } from "@/features/sessions/types/session.types";
import type { Timeframe } from "@/lib/dates/utils/period.util";

export type EngineeringContextValue =
  (typeof ENGINEERING_CONTEXT_VALUES)[number];
export type EngineeringEvidenceTypeValue =
  (typeof ENGINEERING_EVIDENCE_TYPE_VALUES)[number];
export type EngineeringProjectStatusValue =
  (typeof ENGINEERING_PROJECT_STATUS_VALUES)[number];
export type TechnologyCategoryValue =
  (typeof TECHNOLOGY_CATEGORY_VALUES)[number];

export type EngineeringTechnologyOption = {
  id: string;
  name: string;
  slug: string;
  category: TechnologyCategoryValue;
  iconKey: string | null;
  isBuiltIn: boolean;
};

export type EngineeringProjectReference = {
  id: string;
  name: string;
};

export type EngineeringProjectOption = EngineeringProjectReference & {
  context: EngineeringContextValue;
};

export type EngineeringProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  context: EngineeringContextValue;
  status: EngineeringProjectStatusValue;
  repositoryUrl: string | null;
  liveUrl: string | null;
  startedOn: string | null;
  completedOn: string | null;
  archivedAt: string | null;
  sessionCount: number;
  evidenceCount: number;
  technologies: EngineeringTechnologyOption[];
};

export type EngineeringEvidenceListItem = {
  id: string;
  type: EngineeringEvidenceTypeValue;
  title: string;
  details: string | null;
  occurredAt: string;
  project: EngineeringProjectReference | null;
  session: {
    id: string;
    description: string | null;
    activityName: string;
  } | null;
};

export type EngineeringProjectDetail = EngineeringProjectListItem & {
  notes: string | null;
  totalSeconds: number;
  sessions: SessionListItem[];
  evidence: EngineeringEvidenceListItem[];
};

export type EngineeringBreakdownItem = {
  id: string;
  label: string;
  seconds: number;
};

export type EngineeringProjectContextBreakdownItem = {
  id: EngineeringContextValue;
  label: string;
  projectCount: number;
};

export type EngineeringAnalyticsData = {
  timeframe: Timeframe;
  periodLabel: string;
  totalSeconds: number;
  previousTotalSeconds: number;
  comparisonPercent: number | null;
  activeDays: number;
  chart: Array<{ label: string; seconds: number }>;
  projects: EngineeringBreakdownItem[];
  activities: EngineeringBreakdownItem[];
  contexts: EngineeringBreakdownItem[];
  workedProjectContexts: EngineeringProjectContextBreakdownItem[];
  technologies: EngineeringBreakdownItem[];
  evidence: Array<{
    type: EngineeringEvidenceTypeValue;
    label: string;
    count: number;
    previousCount: number;
  }>;
};
