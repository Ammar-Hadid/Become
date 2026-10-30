"use client";

import { useId, type ComponentPropsWithRef } from "react";
import { FieldError, FieldHelp, FieldLabel } from "./field.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./input.css";

export type InputProps = ComponentPropsWithRef<"input"> & {
  variant?: "featured" | "body";
  label?: string;
  help?: string;
  error?: string;
};

/** Approved underline input. Omit label only when the caller supplies one. */
export function Input({
  variant = "body",
  label,
  help,
  error,
  id,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptions = [
    describedBy,
    help && `${inputId}-help`,
    error && `${inputId}-error`,
  ]
    .filter(Boolean)
    .join(" ");
  const control = (
    <input
      {...props}
      id={inputId}
      data-variant={variant}
      className={cn("become-input", className)}
      aria-describedby={descriptions || undefined}
      aria-invalid={error ? true : invalid}
    />
  );
  if (!label && !help && !error) return control;
  return (
    <div className="become-input-field" data-variant={variant}>
      {label && (
        <FieldLabel className="become-input-label" htmlFor={inputId}>
          {label}
        </FieldLabel>
      )}
      {control}
      {help && <FieldHelp id={`${inputId}-help`}>{help}</FieldHelp>}
      {error && <FieldError id={`${inputId}-error`}>{error}</FieldError>}
    </div>
  );
}
