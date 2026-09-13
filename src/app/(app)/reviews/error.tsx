"use client";

import { ReviewUnavailable } from "@/features/reviews/recovery/components/review-unavailable.component";

export default function ReviewsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ReviewUnavailable retry={retry} />;
}
