import type { Metadata } from "next";
import { SoundReview } from "@/features/sound-review/components/sound-review.component";

export const metadata: Metadata = {
  title: "Sound studies",
};

export default function SoundReviewPage() {
  return <SoundReview />;
}
