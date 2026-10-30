import type { Metadata } from "next";
import { TypingReview } from "@/features/typing-review/components/typing-review.component";

export const metadata: Metadata = { title: "C.O.T.S typing studies" };

export default function TypingReviewPage() {
  return <TypingReview />;
}
