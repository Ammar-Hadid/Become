import type { Metadata } from "next";
import { PhoneResizeReview } from "@/features/design-review/phone-resize/components/phone-resize-review.component";

export const metadata: Metadata = {
  title: "Phone viewport resize study · Become",
};

export default function PhoneResizeReviewPage() {
  return <PhoneResizeReview />;
}
