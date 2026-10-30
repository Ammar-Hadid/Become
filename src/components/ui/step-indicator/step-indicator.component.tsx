import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import "./step-indicator.css";

export type StepIndicatorItem = {
  id: string;
  label: string;
  state: "complete" | "current" | "upcoming";
};

/** Approved informational phase/step indicator. Navigation stays feature-owned. */
export function StepIndicator({
  items,
  label,
  variant = "numbered",
}: {
  items: readonly StepIndicatorItem[];
  label: string;
  variant?: "phase" | "numbered";
}) {
  return (
    <ol
      aria-label={label}
      style={{ "--step-count": items.length } as CSSProperties}
      className="opening-step-indicator"
      data-variant={variant}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          data-state={item.state}
          aria-current={item.state === "current" ? "step" : undefined}
        >
          {variant === "numbered" && (
            <span
              className="opening-step-number type-system"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <span className="opening-step-label type-body-sm">
            <span className="opening-step-marker" aria-hidden="true">
              {item.state === "complete" && <Check />}
            </span>
            <span>{item.label}</span>
          </span>
          <span className="sr-only">
            {variant === "numbered" ? `Step ${index + 1}. ` : ""}
            {item.state === "complete"
              ? "Completed"
              : item.state === "current"
                ? "Current step"
                : "Not started"}
          </span>
        </li>
      ))}
    </ol>
  );
}
