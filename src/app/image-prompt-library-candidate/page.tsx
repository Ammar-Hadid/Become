import type { Metadata } from "next";
import { ImagePromptLibraryCandidate } from "@/features/design-review/manual-imagery/image-prompt-library-candidate.component";
export const metadata: Metadata = {
  title: { absolute: "Image prompt library preview · Become" },
};
export default function ImagePromptLibraryCandidatePage() {
  return <ImagePromptLibraryCandidate />;
}
