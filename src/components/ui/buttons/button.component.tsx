import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/styles/utils/class-name.util";
import { Check } from "lucide-react";

export type ButtonFeedback = {
  state: "idle" | "pending" | "success";
  label: string;
  icon: React.ReactNode;
  pendingLabel?: string;
  successLabel?: string;
};

const buttonVariants = cva("become-button", {
  variants: {
    variant: {
      primary: "become-button--primary",
      secondary: "become-button--secondary",
      ghost: "become-button--ghost",
      danger: "become-button--danger",
    },
    size: {
      sm: "become-button--sm",
      md: "become-button--md",
      lg: "become-button--lg",
      icon: "become-button--icon",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export function Button({
  className,
  variant,
  size,
  feedback,
  children,
  ...props
}: React.ComponentPropsWithRef<"button"> &
  VariantProps<typeof buttonVariants> & { feedback?: ButtonFeedback }) {
  const treatment = !variant || variant === "primary" ? feedback : undefined;
  const label =
    treatment?.state === "success"
      ? (treatment.successLabel ?? "Done")
      : treatment?.state === "pending"
        ? (treatment.pendingLabel ?? "Working…")
        : treatment?.label;
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      data-feedback={treatment?.state}
      aria-label={treatment ? label : props["aria-label"]}
      aria-busy={treatment ? treatment.state === "pending" : props["aria-busy"]}
    >
      {treatment ? (
        <>
          <span className="become-button-feedback-icons" aria-hidden="true">
            <span className="become-button-feedback-original">
              {treatment.icon}
            </span>
            <Check className="become-button-feedback-check" />
          </span>
          <span className="become-button-feedback-labels" aria-hidden="true">
            <span data-label="idle">{treatment.label}</span>
            <span data-label="pending">
              {treatment.pendingLabel ?? "Working…"}
            </span>
            <span data-label="success">{treatment.successLabel ?? "Done"}</span>
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
