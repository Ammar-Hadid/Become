"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { Card } from "@/components/ui/cards/card.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./featured-card.css";

export type FeaturedCardProps = Omit<
  ComponentProps<typeof Card>,
  "material"
> & {
  paused?: boolean;
  facing?: "left" | "right";
};

/** Approved floating surface for AI/featured content; content remains feature-owned. */
export function FeaturedCard({
  paused = false,
  facing = "left",
  className,
  children,
  ...props
}: FeaturedCardProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let intersects = false;
    const update = () => {
      element.dataset.motion =
        !paused && intersects && document.visibilityState === "visible"
          ? "running"
          : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [paused]);
  return (
    <div
      ref={root}
      className={cn("become-featured-card", className)}
      data-facing={facing}
      data-motion="paused"
    >
      <div className="become-featured-card__depth" aria-hidden="true" />
      <Card {...props} material="solid" className="become-featured-card__face">
        <div className="become-featured-card__content">{children}</div>
      </Card>
    </div>
  );
}
