import { cn } from "@/lib/styles/utils/class-name.util";

export type LoadingVariant = "orbit-arc" | "edge-trace" | "eclipse";

export type LoadingArea =
  | "dashboard"
  | "engineering"
  | "finance"
  | "entrepreneurship"
  | "content"
  | "direction";

type LoadingIndicatorProps = {
  label: string;
  variant?: LoadingVariant;
  area?: LoadingArea;
  className?: string;
};

export function LoadingIndicator({
  label,
  variant = "orbit-arc",
  area = "dashboard",
  className,
}: LoadingIndicatorProps) {
  return (
    <span
      className={cn("become-loading", className)}
      data-loading-variant={variant}
      data-loading-area={area}
      role="status"
      aria-label={label}
    >
      {variant === "orbit-arc" && (
        <span className="become-loading__orbit" aria-hidden="true" />
      )}
      {variant === "edge-trace" && (
        <span className="become-loading__edge" aria-hidden="true">
          <span />
          <span />
        </span>
      )}
      {variant === "eclipse" && (
        <span className="become-loading__eclipse" aria-hidden="true">
          <span className="become-loading__eclipse-orbit" />
        </span>
      )}
    </span>
  );
}
