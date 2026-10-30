import type { Metadata } from "next";
import { ManualImageryCandidate } from "@/features/design-review/manual-imagery/manual-imagery-candidate.component";
export const metadata: Metadata = {
  title: { absolute: "Manual Season imagery preview · Become" },
};
export default function ManualSeasonImageryCandidatePage() {
  return <ManualImageryCandidate />;
}
