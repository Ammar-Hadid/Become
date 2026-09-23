import { z } from "zod";
import { INTERVIEW_GUIDE_MARKETS } from "@/features/entrepreneurship/interview-guides/constants/interview-guide.constants";

const metadata = z.object({
  nicheId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2_000),
  marketType: z.enum(INTERVIEW_GUIDE_MARKETS),
  segmentId: z.string().trim().min(1).max(100).nullable().default(null),
  expectedDurationMinutes: z.number().int().min(5).max(240),
  document: z.unknown(),
});

export const createInterviewGuideSchema = metadata;

export const saveInterviewGuideDraftSchema = metadata.extend({
  expectedVersion: z.number().int().positive(),
});

export const publishInterviewGuideSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export const archiveInterviewGuideSchema = z.object({
  archived: z.boolean(),
});
