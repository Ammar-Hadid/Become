import type { Metadata } from "next";
import { UnderlineInputPreview } from "@/features/design-review/underline-input/underline-input-preview.component";

export const metadata: Metadata = { title: "Underline input preview" };

export default function UnderlineInputCandidatePage() {
  return <UnderlineInputPreview />;
}
