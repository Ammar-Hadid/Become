import type { ComponentProps } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("become-field-label", className)} {...props} />;
}

export function FieldHelp({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("become-field-help", className)} {...props} />;
}

export function FieldError({
  className,
  children,
  role,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      {...props}
      className={cn("become-field-error", className)}
      role={role ?? "alert"}
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" />
        <path
          d="M6 3.3v3.2M6 8.6v.1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
      {children}
    </p>
  );
}
