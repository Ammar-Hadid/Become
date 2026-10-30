import type { Metadata } from "next";
import { FeaturedCardPreview } from "@/features/design-review/featured-card/featured-card-preview.component";
export const metadata: Metadata = {
  title: { absolute: "Featured card preview · Become" },
};
export default function Page() {
  return <FeaturedCardPreview />;
}
