import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export type MenuPlacement = "bottom-end" | "top-stretch";

export const Menu = forwardRef<
  HTMLDivElement,
  {
    label: string;
    open: boolean;
    placement: MenuPlacement;
    children: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
>(function Menu(
  { label, open, placement, children, className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn("menu", `menu--${placement}`, className)}
      role="menu"
      aria-label={label}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
});
