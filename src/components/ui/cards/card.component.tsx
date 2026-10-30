import type { HTMLAttributes } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./card.css";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div";
  material?: "solid" | "glass" | "elevated-glass";
  spacing?: "overview" | "dense" | "action";
};

export function Card({
  as: Element = "section",
  material = "glass",
  spacing = "overview",
  className,
  ...props
}: CardProps) {
  return (
    <Element
      className={cn(
        "become-card",
        `become-card--${spacing}`,
        `material-${material}`,
        className,
      )}
      {...props}
    />
  );
}
