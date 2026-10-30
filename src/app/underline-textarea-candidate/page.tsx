import type { Metadata } from "next";
import { UnderlineTextareaPreview } from "@/features/design-review/underline-textarea/underline-textarea-preview.component";

export const metadata: Metadata = {
  title: { absolute: "Textarea preview · Become" },
};
export default function UnderlineTextareaCandidatePage() {
  return <UnderlineTextareaPreview />;
}
