import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/styles/utils/class-name.util";

const buttonVariants = cva(
  "become-button inline-flex cursor-pointer items-center justify-center gap-sm rounded-full text-body font-medium transition-[color,background-color,border-color,opacity,transform] duration-control ease-move outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary:
          "border border-border bg-surface-elevated text-text-primary hover:border-[#3a3f49] hover:bg-[#1d2026]",
        ghost:
          "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
        danger: "bg-danger text-white hover:bg-[#ed7474]",
      },
      size: {
        sm: "h-9 px-lg",
        md: "h-11 px-xl",
        lg: "h-12 px-2xl",
        icon: "size-4xl p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
