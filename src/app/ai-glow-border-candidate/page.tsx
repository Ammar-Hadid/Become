import type { Metadata } from "next";
import { AiGlowBorderPreview } from "@/features/design-review/ai-glow-border/ai-glow-border-preview.component";

export const metadata: Metadata = {
  title: { absolute: "AI glow border preview · Become" },
};

export default function AiGlowBorderCandidatePage() {
  return <AiGlowBorderPreview />;
}
