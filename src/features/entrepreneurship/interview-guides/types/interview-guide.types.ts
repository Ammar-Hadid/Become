import type { INTERVIEW_GUIDE_MARKETS } from "@/features/entrepreneurship/interview-guides/constants/interview-guide.constants";
import type { Prisma } from "@/generated/prisma/client";

export type InterviewGuideMarket = (typeof INTERVIEW_GUIDE_MARKETS)[number];

export type InterviewGuideDocumentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: InterviewGuideDocumentNode[];
};

export type InterviewGuideDocument = {
  schemaVersion: 1;
  content: InterviewGuideDocumentNode;
};

export type InterviewGuideQuestionIndexItem = {
  questionId: string;
  prompt: string;
  intent: string | null;
  probes: string[];
  position: number;
};

export type InterviewGuideDraftView = {
  id: string;
  nicheId: string;
  segmentId: string | null;
  title: string;
  objective: string;
  marketType: string;
  expectedDurationMinutes: number;
  draftDocument: Prisma.JsonValue;
  version: number;
  savedAt: string;
  archivedAt: string | null;
};

export type InterviewGuideSaveResult =
  | { kind: "saved"; guide: InterviewGuideDraftView }
  | {
      kind: "conflict";
      message: string;
      latest: InterviewGuideDraftView;
    }
  | { kind: "rejected" | "uncertain"; message: string };
