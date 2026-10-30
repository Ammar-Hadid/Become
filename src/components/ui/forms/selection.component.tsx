"use client";

import {
  useCallback,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

type NativeSelectionProps = Omit<ComponentProps<"input">, "type">;
type CheckboxProps = NativeSelectionProps & { indeterminate?: boolean };

function updateRef(
  ref: Ref<HTMLInputElement> | undefined,
  node: HTMLInputElement | null,
) {
  if (typeof ref === "function") return ref(node);
  if (ref) ref.current = node;
}

export function Checkbox({
  className,
  indeterminate = false,
  ref,
  ...props
}: CheckboxProps) {
  const inputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate;
      const cleanup = updateRef(ref, node);

      return () => {
        if (node) node.indeterminate = false;
        if (typeof cleanup === "function") cleanup();
        else updateRef(ref, null);
      };
    },
    [indeterminate, ref],
  );

  return (
    <input
      {...props}
      ref={inputRef}
      type="checkbox"
      className={cn("become-selection become-selection--checkbox", className)}
    />
  );
}

export function Radio({ className, ...props }: NativeSelectionProps) {
  return (
    <input
      {...props}
      type="radio"
      className={cn("become-selection become-selection--radio", className)}
    />
  );
}

export function Switch({ className, role, ...props }: NativeSelectionProps) {
  return (
    <input
      {...props}
      type="checkbox"
      role={role ?? "switch"}
      className={cn("become-selection become-selection--switch", className)}
    />
  );
}

export function SelectionLabel({
  className,
  ...props
}: ComponentProps<"label">) {
  return (
    <label className={cn("become-selection-label", className)} {...props} />
  );
}

export function SelectionCopy({
  children,
  className,
  help,
  helpId,
}: {
  children: ReactNode;
  className?: string;
  help?: ReactNode;
  helpId?: string;
}) {
  return (
    <span className={cn("become-selection-copy", className)}>
      <span className="become-selection-text">{children}</span>
      {help ? (
        <span id={helpId} className="become-selection-help">
          {help}
        </span>
      ) : null}
    </span>
  );
}
