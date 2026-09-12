import type {
  GoalDraft,
  ExperimentDraft,
  OwnedOption,
} from "@/features/direction/types/direction.types";
import type {
  ContentIntent,
  ContentFormat,
  ContentLink,
} from "@/features/content/types/content.types";
export type IdeaDraft = { title: string; notes: string; domainIds: string[] };
export type IdeaView = IdeaDraft & {
  id: string;
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  domains: OwnedOption[];
  outputsCount: number;
  outputsNextCursor: string | null;
  historyNextCursor: string | null;
  outputs: (ContentLink & {
    type: "CONTENT" | "GOAL" | "EXPERIMENT";
    linkedAt: string;
    kind: "CREATED" | "LINKED";
  })[];
  history: { id: string; kind: string; createdAt: string; snapshot: unknown }[];
};
export type DecisionContext = {
  contentId?: string;
  projectId?: string;
  goalId?: string;
  experimentId?: string;
  nicheId?: string;
  seasonId?: string;
};
export type DecisionDraft = DecisionContext & {
  choice: string;
  reason: string;
  decidedOn: string;
  context: string;
  alternatives: string;
  expectedOutcome: string;
  reconsiderWhen: string;
  reviewOn: string | null;
};
export type DecisionView = DecisionDraft & {
  id: string;
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  links: ContentLink[];
  supersedes: ContentLink | null;
  supersededBy: ContentLink | null;
  historyNextCursor: string | null;
  reflectionsNextCursor: string | null;
  history: {
    id: string;
    version: number;
    reason: string;
    createdAt: string;
    snapshot: unknown;
  }[];
  reflections: {
    id: string;
    assessment: "HELPFUL" | "MIXED" | "NOT_HELPFUL" | "TOO_EARLY";
    reflection: string;
    reflectedOn: string;
    enteredAt: string;
  }[];
};
export type ThinkingPage<T> = { items: T[]; nextCursor: string | null };
export type ThinkingOptions = {
  domains: OwnedOption[];
  content: OwnedOption[];
  goals: OwnedOption[];
  experiments: OwnedOption[];
  projects: OwnedOption[];
  niches: OwnedOption[];
  seasons: OwnedOption[];
};
export type ThinkingCommand =
  | {
      type: "SAVE_IDEA";
      operationKey: string;
      id?: string;
      expectedVersion?: number;
      draft: IdeaDraft;
    }
  | {
      type: "ARCHIVE_IDEA";
      operationKey: string;
      id: string;
      expectedVersion: number;
      archived: boolean;
    }
  | {
      type: "PROMOTE_IDEA";
      operationKey: string;
      ideaId: string;
      destination: "CONTENT";
      draft: ContentIntent;
      format: ContentFormat;
    }
  | {
      type: "PROMOTE_IDEA";
      operationKey: string;
      ideaId: string;
      destination: "GOAL";
      draft: GoalDraft;
    }
  | {
      type: "PROMOTE_IDEA";
      operationKey: string;
      ideaId: string;
      destination: "EXPERIMENT";
      draft: ExperimentDraft;
    }
  | {
      type: "LINK_IDEA";
      operationKey: string;
      ideaId: string;
      destination: "CONTENT" | "GOAL" | "EXPERIMENT";
      destinationId: string;
    }
  | {
      type: "SAVE_DECISION";
      operationKey: string;
      id?: string;
      expectedVersion?: number;
      draft: DecisionDraft;
      changeReason?: string;
      supersedesId?: string;
    }
  | {
      type: "ARCHIVE_DECISION";
      operationKey: string;
      id: string;
      expectedVersion: number;
      archived: boolean;
    }
  | {
      type: "REFLECT_DECISION";
      operationKey: string;
      id: string;
      assessment: "HELPFUL" | "MIXED" | "NOT_HELPFUL" | "TOO_EARLY";
      reflection: string;
      reflectedOn: string;
    };
export type ThinkingCommandResult = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  id?: string;
  href?: string;
  version?: number;
  savedAt?: string;
  idea?: IdeaView;
  decision?: DecisionView;
  delivery?: "confirmed" | "uncertain";
};
