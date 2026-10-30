import { AreaIcon } from "@/components/ui/icons/area-icon.component";
import type { IconTreatment } from "@/components/ui/icons/icon-frame.component";

export function DomainIcon({
  slug,
  className,
  treatment = "bare",
}: {
  slug: string;
  className?: string;
  treatment?: IconTreatment;
}) {
  return <AreaIcon area={slug} treatment={treatment} className={className} />;
}
