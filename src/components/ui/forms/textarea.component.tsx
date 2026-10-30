"use client";

import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";
import { FieldError, FieldHelp, FieldLabel } from "./field.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./input.css";
import "./textarea.css";
import { TEXTAREA_ROWS } from "./textarea.config";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  variant?: "featured" | "body";
  size?: keyof typeof TEXTAREA_ROWS;
  label?: string;
  help?: string;
  error?: string;
};

/** Approved multiline underline field. The caller owns value, validation and persistence. */
export function Textarea({
  variant = "body",
  label,
  help,
  error,
  size = "sm",
  rows = TEXTAREA_ROWS[size],
  id,
  className,
  style,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptions = [
    describedBy,
    help && `${controlId}-help`,
    error && `${controlId}-error`,
  ]
    .filter(Boolean)
    .join(" ");
  const control = (
    <textarea
      {...props}
      id={controlId}
      rows={rows}
      data-variant={variant}
      className={cn("become-textarea", `become-textarea--${size}`, className)}
      style={{ "--textarea-rows": rows, ...style } as CSSProperties}
      aria-describedby={descriptions || undefined}
      aria-invalid={error ? true : invalid}
    />
  );
  if (!label && !help && !error) return control;
  return (
    <div
      className="become-input-field become-textarea-field"
      data-variant={variant}
    >
      {label && (
        <FieldLabel className="become-input-label" htmlFor={controlId}>
          {label}
        </FieldLabel>
      )}
      {control}
      {help && <FieldHelp id={`${controlId}-help`}>{help}</FieldHelp>}
      {error && <FieldError id={`${controlId}-error`}>{error}</FieldError>}
    </div>
  );
}
