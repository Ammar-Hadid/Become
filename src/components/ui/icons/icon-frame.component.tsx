import type { ReactNode } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export type IconArea =
  | "dashboard"
  | "engineering"
  | "finance"
  | "entrepreneurship"
  | "content"
  | "direction";

export type IconTreatment = "bare" | "compact" | "featured";

export function IconFrame({
  children,
  treatment = "bare",
  area,
  className,
}: {
  children: ReactNode;
  treatment?: IconTreatment;
  area?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "become-icon-frame",
        `become-icon-frame--${treatment}`,
        className,
      )}
      data-icon-area={area}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
