import type { SessionListItem } from "@/features/sessions/types/session.types";

export type ContentFormat = "LONG_FORM" | "SHORT_VERTICAL" | "OTHER";
export type ContentStage =
  "PLANNING" | "WRITING" | "RECORDING" | "EDITING" | "READY";
export type ChannelPlatform = "YOUTUBE" | "TIKTOK" | "INSTAGRAM" | "OTHER";
export type ContentIntent = {
  title: string;
  purpose: string;
  audience: string;
  notes: string;
};
export type ContentWriting = {
  hook: string;
  outline: string;
  script: string;
  productionNotes: string;
};
export type ChannelDraft = {
  name: string;
  platform: ChannelPlatform;
  account: string;
  platformLabel?: string;
};
export type ChannelView = ChannelDraft & {
  id: string;
  version: number;
  displayName: string;
  platformName: string;
  archivedAt: string | null;
};
export type ContentLink = {
  id: string;
  label: string;
  href: string;
  archived: boolean;
};
export type PublicationDraft = {
  channelId: string;
  publishedTitle: string;
  publishedOn: string;
  publishedAt?: string | null;
  url: string;
  placement: string;
};
export type ObservationDraft = {
  observedAt: string;
  views: string | null;
  likes: string | null;
  comments: string | null;
  note: string;
};
export type ObservationView = ObservationDraft & {
  id: string;
  enteredAt: string;
  supersedesId: string | null;
  correctionReason: string | null;
  superseded: boolean;
};
export type LatestMetric = {
  value: string;
  observedAt: string;
  enteredAt: string;
  observationId: string;
} | null;
export type PublicationView = PublicationDraft & {
  id: string;
  version: number;
  variantId: string;
  channel: ChannelView;
  sourceKind: "MANUAL";
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  history: {
    id: string;
    version: number;
    kind: string;
    reason: string;
    recordedAt: string;
    snapshot: unknown;
  }[];
  historyNextCursor: string | null;
  observationCount: number;
  observations: ObservationView[];
  observationsNextCursor: string | null;
  latest: { views: LatestMetric; likes: LatestMetric; comments: LatestMetric };
};
export type VariantView = ContentWriting & {
  id: string;
  contentId: string;
  version: number;
  writingVersion: number;
  mediaVersion: number;
  name: string;
  format: ContentFormat;
  stage: ContentStage;
  stageLabel: string;
  nextStep: string;
  guidance: string;
  plannedOn: string | null;
  archivedAt: string | null;
  thumbnail: { id: string; url: string; width: number; height: number } | null;
  createdAt: string;
  updatedAt: string;
  writingSavedAt: string;
  publications: PublicationView[];
  publicationsNextCursor: string | null;
};
export type ContentWorkspace = ContentIntent & {
  workspaceVersion: number;
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  variants: VariantView[];
  variantsNextCursor: string | null;
  channels: ChannelView[];
  ideas: ContentLink[];
  decisions: ContentLink[];
  goals: ContentLink[];
  experiments: ContentLink[];
  sessions: SessionListItem[];
  sessionsNextCursor: string | null;
  recordedTime: {
    seconds: number;
    byActivity: { name: string; seconds: number }[];
    activeSessionId: string | null;
  };
  timer: { domainId: string; activities: { id: string; name: string }[] };
};
export type ContentSummary = {
  id: string;
  title: string;
  purpose: string;
  updatedAt: string;
  archivedAt: string | null;
  variantCount: number;
  publicationCount: number;
  stageLabel: string;
  nextStep: string;
  thumbnailUrl: string | null;
  activeSessionId: string | null;
  href: string;
};
export type ContentDesk = {
  items: ContentSummary[];
  nextCursor: string | null;
  continueMaking: ContentSummary | null;
  recentPublications: {
    id: string;
    contentTitle: string;
    variantName: string;
    channelName: string;
    publishedOn: string;
    href: string;
  }[];
  ideas: ContentLink[];
};
export type ContentPeriod = "week" | "month" | "season" | "year";
export type ContentAnalytics = {
  asOf: string;
  availability: "AVAILABLE" | "NOT_STARTED";
  allTimeRecordedSecondsForReleasedWorks: number;
  recentResultsScope: string;
  period: ContentPeriod;
  startOn: string;
  endOn: string;
  label: string;
  contentCreated: number;
  variantsCreated: number;
  publicationsMade: number;
  recordedSeconds: number;
  unlinkedSeconds: number;
  activeSessionCount: number;
  byActivity: { name: string; seconds: number }[];
  byContent: { id: string; title: string; seconds: number }[];
  publicationGroups: {
    platform: string;
    format: string;
    count: number;
    withResults: number;
  }[];
  recentResults: {
    publicationId: string;
    contentTitle: string;
    channelName: string;
    format: string;
    publishedOn: string;
    latest: PublicationView["latest"];
    href: string;
  }[];
};
export type ContentCommand =
  | {
      type: "CREATE_CONTENT";
      operationKey: string;
      draft: ContentIntent;
      format: ContentFormat;
      ideaId?: string;
    }
  | {
      type: "SAVE_CONTENT";
      operationKey: string;
      contentId: string;
      expectedVersion: number;
      draft: ContentIntent;
    }
  | {
      type: "ARCHIVE_CONTENT";
      operationKey: string;
      contentId: string;
      expectedVersion: number;
      archived: boolean;
    }
  | {
      type: "CREATE_VARIANT";
      operationKey: string;
      contentId: string;
      name: string;
      format: ContentFormat;
    }
  | {
      type: "SAVE_WRITING";
      operationKey: string;
      contentId: string;
      variantId: string;
      expectedWritingVersion: number;
      draft: ContentWriting;
    }
  | {
      type: "SAVE_VARIANT";
      operationKey: string;
      contentId: string;
      variantId: string;
      expectedVersion: number;
      name: string;
      format: ContentFormat;
      stage: ContentStage;
      nextStep: string;
      plannedOn: string | null;
      archived: boolean;
    }
  | {
      type: "SAVE_CHANNEL";
      operationKey: string;
      id?: string;
      expectedVersion?: number;
      draft: ChannelDraft;
      archived?: boolean;
    }
  | {
      type: "PUBLISH";
      operationKey: string;
      contentId: string;
      variantId: string;
      publications: PublicationDraft[];
    }
  | {
      type: "CORRECT_PUBLICATION";
      operationKey: string;
      contentId: string;
      publicationId: string;
      expectedVersion: number;
      draft: PublicationDraft;
      reason: string;
    }
  | {
      type: "WITHDRAW_PUBLICATION";
      operationKey: string;
      contentId: string;
      publicationId: string;
      expectedVersion: number;
      withdrawn: boolean;
      reason: string;
    }
  | {
      type: "RECORD_OBSERVATION";
      operationKey: string;
      contentId: string;
      publicationId: string;
      draft: ObservationDraft;
      supersedesId?: string;
      reason?: string;
    };
export type ContentCommandResult = {
  existingRelease?: {
    id: string;
    contentId: string;
    href: string;
    title: string;
  };
  error: string | null;
  fieldErrors?: Record<string, string>;
  id?: string;
  version?: number;
  writingVersion?: number;
  savedAt?: string;
  workspace?: ContentWorkspace;
  channels?: ChannelView[];
  delivery?: "confirmed" | "uncertain";
};
