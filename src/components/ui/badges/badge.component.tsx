import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";
import type { IconArea } from "../icons/icon-frame.component";

export type BadgeVariant = "aurora-fill" | "live-numeral" | "specimen-strip";

type BadgeProps = {
  variant: BadgeVariant;
  area?: IconArea;
  children: ReactNode;
  className?: string;
};

type RemovableBadgeProps = {
  label: string;
  onRemove: () => void;
  area?: IconArea;
  removeLabel?: string;
  className?: string;
};

/** Read-only status, count, or metadata. The variant conveys its role. */
export function Badge({
  variant,
  area = "dashboard",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn("become-badge type-system", className)}
      data-badge-variant={variant}
      data-badge-area={area}
    >
      {variant === "live-numeral" && (
        <span className="become-badge__live-dot" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

/** Controlled filter chip. The owning feature removes the filter on activation. */
export function RemovableBadge({
  label,
  onRemove,
  area = "dashboard",
  removeLabel,
  className,
}: RemovableBadgeProps) {
  return (
    <button
      type="button"
      className={cn(
        "become-badge become-badge--removable type-system",
        className,
      )}
      data-badge-area={area}
      aria-label={removeLabel ?? `Remove ${label}`}
      onClick={onRemove}
    >
      <span>{label}</span>
      <span className="become-badge__remove-icon" aria-hidden="true">
        <X />
      </span>
    </button>
  );
}
