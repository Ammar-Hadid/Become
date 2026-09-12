import type { ContentStage } from "@/features/content/types/content.types";
export const CONTENT_STAGES: Record<
  ContentStage,
  { label: string; guidance: string }
> = {
  PLANNING: {
    label: "Shaping the idea",
    guidance: "Find the point you want to make.",
  },
  WRITING: {
    label: "Writing",
    guidance: "Shape the hook and the story in your own way.",
  },
  RECORDING: {
    label: "Recording",
    guidance: "Make the material this variant needs.",
  },
  EDITING: {
    label: "Editing",
    guidance: "Bring the cut, pacing and packaging together.",
  },
  READY: {
    label: "Ready to release",
    guidance: "Record a release when this variant is actually live.",
  },
};
export const CONTENT_PLATFORMS = {
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  OTHER: "Other",
} as const;
