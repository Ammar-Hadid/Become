import type { Metadata } from "next";
import { CopySuccessCandidate } from "@/features/design-review/copy-success/copy-success-candidate.component";
export const metadata: Metadata = {
  title: { absolute: "Copy button success preview · Become" },
};
export default function CopyButtonSuccessCandidatePage() {
  return <CopySuccessCandidate />;
}
