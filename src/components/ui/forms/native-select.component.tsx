import type { ComponentPropsWithRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./select.css";

/** Native form semantics with the shared select's geometry and reserved chevron space. */
export function NativeSelect({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"select">) {
  return (
    <span className="select-wrap become-native-select">
      <select {...props} className={cn(className)}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}
