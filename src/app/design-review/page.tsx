import type { Metadata } from "next";
import { InterfaceSoundProvider } from "@/components/ui/sound/components/interface-sound-provider.component";
import { DesignReview } from "@/features/design-review/components/design-review.component";

export const metadata: Metadata = {
  title: "Shared system review",
};

export default function DesignReviewPage() {
  return <InterfaceSoundProvider><DesignReview /></InterfaceSoundProvider>;
}
