import {
  ChartNoAxesCombined,
  Code2,
  Compass,
  FilePenLine,
  LayoutDashboard,
  Rocket,
} from "lucide-react";
import {
  IconFrame,
  type IconArea,
  type IconTreatment,
} from "@/components/ui/icons/icon-frame.component";

const areaGlyphs = {
  dashboard: LayoutDashboard,
  engineering: Code2,
  finance: ChartNoAxesCombined,
  entrepreneurship: Rocket,
  content: FilePenLine,
  direction: Compass,
} as const;

export function AreaIcon({
  area,
  treatment = "bare",
  className,
}: {
  area: string;
  treatment?: IconTreatment;
  className?: string;
}) {
  const Glyph = areaGlyphs[area as IconArea] ?? Compass;
  return (
    <IconFrame area={area} treatment={treatment} className={className}>
      <Glyph />
    </IconFrame>
  );
}
