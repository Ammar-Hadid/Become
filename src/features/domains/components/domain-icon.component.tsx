import { Braces, Compass, Landmark, Play } from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";

const icons = {
  engineering: Braces,
  entrepreneurship: Compass,
  finance: Landmark,
  content: Play,
};

export function DomainIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = icons[slug as keyof typeof icons] ?? Compass;
  return <Icon className={cn("size-4", className)} strokeWidth={1.8} />;
}
