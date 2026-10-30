import type { Metadata } from "next";
import { AiLongTextPreview } from "@/features/design-review/ai-long-text/ai-long-text-preview.component";

export const metadata: Metadata = {
  title: { absolute: "Living Ink preview · Become" },
};

export default function AiLongTextCandidatePage() {
  return <AiLongTextPreview />;
}
